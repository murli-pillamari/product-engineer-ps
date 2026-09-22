"use client";

import { useEffect, useRef, useState } from "react";

type ChatEvent = {
  id: string;
  runId: string;
  sequence: number;
  type: string;
  payload: {
    text: string;
  };
};

export default function Home() {
  const socketRef = useRef<WebSocket | null>(null);

  const [connectionState, setConnectionState] =
    useState("disconnected");

  const [events, setEvents] = useState<ChatEvent[]>([]);

  const [runState, setRunState] = useState("idle");

  const [runId, setRunId] = useState<string | null>(null);

  const [lastSequence, setLastSequence] = useState(0);

  const runIdRef = useRef<string | null>(null);
  const lastSequenceRef = useRef(0);

  function connect() {
    const socket = new WebSocket("ws://localhost:4000");

    socketRef.current = socket;

    setConnectionState("connecting");

    socket.onopen = () => {
      setConnectionState("connected");

      if (runIdRef.current) {
        socket.send(
          JSON.stringify({
            type: "resume_run",
            runId: runIdRef.current,
            lastSequence: lastSequenceRef.current,
          })
        );
      }
    };

    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);

      console.log("Server message:", data);

      if (data.type === "connection") {
        setConnectionState(data.state);
      }

      if (data.type === "run_started") {
        setRunId(data.runId);
        runIdRef.current = data.runId;

        setRunState("running");

        setLastSequence(0);
        lastSequenceRef.current = 0;
      }

      if (data.type === "event") {
        const event = data.event as ChatEvent;

        setEvents((current) => {
          if (
            current.some(
              (existing) => existing.id === event.id
            )
          ) {
            return current;
          }

          return [...current, event].sort(
            (a, b) => a.sequence - b.sequence
          );
        });

        lastSequenceRef.current = Math.max(
          lastSequenceRef.current,
          event.sequence
        );

        setLastSequence(lastSequenceRef.current);
      }

      if (data.type === "run_completed") {
        setRunState("completed");
      }

      if (data.type === "resume_complete") {
        setRunState(data.status);
      }

      if (data.type === "run_failed") {
        setRunState("failed");
      }

      if (data.type === "resume_error") {
        console.error("Resume failed:", data);
      }
    };

    socket.onclose = () => {
      setConnectionState("disconnected");
    };

    socket.onerror = () => {
      setConnectionState("disconnected");
    };
  }


useEffect(() => {
  connect();

  return () => {
    socketRef.current?.close();
  };
}, []);

function disconnect() {
  socketRef.current?.close();
}

function reconnect() {
  if (
    socketRef.current?.readyState === WebSocket.OPEN ||
    socketRef.current?.readyState === WebSocket.CONNECTING
  ) {
    return;
  }

  setConnectionState("reconnecting");

  connect();
}

  function startRun() {
    setEvents([]);
    setRunState("starting");

    socketRef.current?.send(
      JSON.stringify({
        type: "start_run",
      })
    );
  }

  const response = events
    .sort((a, b) => a.sequence - b.sequence)
    .map((event) => event.payload.text)
    .join("");

  return (
    <main className="min-h-screen p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">
          Caygnus Resumable Chat
        </h1>

        <div className="mt-4 flex gap-3">
  <button
    onClick={disconnect}
    className="rounded border px-4 py-2"
  >
    Disconnect
  </button>

  <button
    onClick={reconnect}
    className="rounded border px-4 py-2"
  >
    Reconnect
  </button>
</div>


<div className="mt-4">
  Last received sequence:
  <strong className="ml-2">
    {lastSequence}
  </strong>
</div>

        <div className="mt-6 flex gap-4">
          <div>
            Connection:
            <strong className="ml-2">
              {connectionState}
            </strong>
          </div>

          <div>
            Run:
            <strong className="ml-2">
              {runState}
            </strong>
          </div>
        </div>

        <button
          onClick={startRun}
          className="mt-8 rounded bg-black px-5 py-3 text-white"
        >
          Start Conversation
        </button>

        <div className="mt-8 rounded border p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Assistant Response
          </h2>

          <p className="whitespace-pre-wrap">
            {response || "Waiting for response..."}
          </p>
        </div>

        <div className="mt-6 rounded border p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Events
          </h2>

          <div className="space-y-1 text-sm">
            {events.map((event) => (
              <div key={event.id}>
                #{event.sequence} →{" "}
                {event.payload.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}