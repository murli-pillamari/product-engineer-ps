import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { events, runs } from "../db/schema";
import { fakeGenerator, type FakeGeneratorOptions } from "../generator/fakeGenerator";
type StartRunInput = {
  runId: string;
  conversationId: string;
  userMessageId: string;

  generatorOptions?: FakeGeneratorOptions;

  onEvent?: (event: {
    id: string;
    runId: string;
    sequence: number;
    type: string;
    payload: {
      text: string;
    };
  }) => void;
};

export async function startRun({
  runId,
  conversationId,
  userMessageId,
  generatorOptions,
  onEvent,
}: StartRunInput) {

  const now = new Date();

  await db.insert(runs).values({
    id: runId,
    conversationId,
    userMessageId,
    status: "running",
    createdAt: now,
  });

  let sequence = 0;

  try {
    for await (const chunk of fakeGenerator({
      count: 30,
      delayMs: 500,
      ...generatorOptions,
    })) {
      sequence++;

      const eventId = randomUUID();

      const payload = {
        text: chunk,
      };

      // 1. Persist event first
      await db.insert(events).values({
        id: eventId,
        runId,
        sequence,
        type: "text_delta",
        payload: JSON.stringify(payload),
        createdAt: new Date(),
      });

      // 2. Then notify WebSocket layer
      onEvent?.({
        id: eventId,
        runId,
        sequence,
        type: "text_delta",
        payload,
      });

      console.log(
        `Persisted event ${sequence} for run ${runId}: ${chunk}`
      );
    }

    await db
      .update(runs)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(runs.id, runId));

    return runId;
  } catch (error) {
    await db
      .update(runs)
      .set({
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Unknown generator error",
      })
      .where(eq(runs.id, runId));

    throw error;
  }
}