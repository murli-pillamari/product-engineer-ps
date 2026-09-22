import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { randomUUID } from "crypto";

import { db } from "./db";
import { conversations } from "./db/schema";
import { startRun } from "./runs/runService";
import {
  getEventsAfter,
  getRun,
} from "./events/eventService";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

const server = http.createServer(app);

const wss = new WebSocketServer({
  server,
});

wss.on("connection", (socket) => {
  console.log("WebSocket client connected");

  socket.send(
    JSON.stringify({
      type: "connection",
      state: "connected",
    })
  );

  socket.on("message", async (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage.toString());

      console.log("Received:", message);

      if (message.type === "start_run") {
        const conversationId = randomUUID();
        const userMessageId = randomUUID();
        const runId = randomUUID();

        await db.insert(conversations).values({
          id: conversationId,
          createdAt: new Date(),
        });

        socket.send(
          JSON.stringify({
            type: "run_started",
            conversationId,
            userMessageId,
            runId,
          })
        );

        startRun({
          runId,
          conversationId,
          userMessageId,
          onEvent: (event) => {
            if (socket.readyState !== WebSocket.OPEN) {
              return;
            }

            socket.send(
              JSON.stringify({
                type: "event",
                event,
              })
            );
          },
        })
          .then((runId) => {
            if (socket.readyState !== WebSocket.OPEN) {
              return;
            }

            socket.send(
              JSON.stringify({
                type: "run_completed",
                runId,
              })
            );
          })
          .catch((error) => {
            console.error("Run failed:", error);

            if (socket.readyState !== WebSocket.OPEN) {
              return;
            }

            socket.send(
              JSON.stringify({
                type: "run_failed",
                error:
                  error instanceof Error
                    ? error.message
                    : "Unknown error",
              })
            );
          });
      }
      if (message.type === "resume_run") {
        const { runId, lastSequence } = message;

        if (
          typeof runId !== "string" ||
          typeof lastSequence !== "number"
        ) {
          socket.send(
            JSON.stringify({
              type: "resume_error",
              code: "INVALID_CURSOR",
              message: "Invalid run ID or cursor.",
            })
          );

          return;
        }

        const run = await getRun(runId);

        if (!run) {
          socket.send(
            JSON.stringify({
              type: "resume_error",
              code: "RUN_NOT_FOUND",
              message: "The requested run does not exist.",
            })
          );

          return;
        }

        const missedEvents = await getEventsAfter(
          runId,
          lastSequence
        );

        for (const event of missedEvents) {
          socket.send(
            JSON.stringify({
              type: "event",
              source: "replay",

              event: {
                id: event.id,
                runId: event.runId,
                sequence: event.sequence,
                type: event.type,
                payload: JSON.parse(event.payload),
              },
            })
          );
        }

        socket.send(
          JSON.stringify({
            type: "resume_complete",
            runId,
            status: run.status,
          })
        );
      }
    } catch (error) {
      console.error("Invalid WebSocket message:", error);

      socket.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message",
        })
      );
    }
  });

  socket.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

const PORT = 4000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket running on ws://localhost:${PORT}`);
});