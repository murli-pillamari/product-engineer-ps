import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "../db";
import { conversations, events, runs } from "../db/schema";
import { startRun } from "../runs/runService";

describe("runService", () => {
  beforeEach(async () => {
    await db.delete(events);
    await db.delete(runs);
    await db.delete(conversations);
  });

  it("persists ordered events and completes successfully", async () => {
    const conversationId = randomUUID();
    const runId = randomUUID();
    const userMessageId = randomUUID();

    await db.insert(conversations).values({
      id: conversationId,
      createdAt: new Date(),
    });

    await startRun({
      runId,
      conversationId,
      userMessageId,
      generatorOptions: {
        count: 5,
        delayMs: 0,
      },
    });

    const storedEvents = await db
      .select()
      .from(events)
      .where(eq(events.runId, runId))
      .orderBy(events.sequence);

    const storedRun = await db
      .select()
      .from(runs)
      .where(eq(runs.id, runId));

    expect(storedEvents).toHaveLength(5);

    expect(
      storedEvents.map((event) => event.sequence)
    ).toEqual([1, 2, 3, 4, 5]);

    expect(storedRun[0].status).toBe("completed");
  });
});


it("persists partial output and marks the run as failed", async () => {
  const conversationId = randomUUID();
  const runId = randomUUID();
  const userMessageId = randomUUID();

  await db.insert(conversations).values({
    id: conversationId,
    createdAt: new Date(),
  });

  await expect(
    startRun({
      runId,
      conversationId,
      userMessageId,
      generatorOptions: {
        count: 10,
        delayMs: 0,
        failAfter: 3,
      },
    })
  ).rejects.toThrow("Fake generator failed");

  const storedEvents = await db
    .select()
    .from(events)
    .where(eq(events.runId, runId))
    .orderBy(events.sequence);

  const storedRun = await db
    .select()
    .from(runs)
    .where(eq(runs.id, runId));

  expect(storedEvents).toHaveLength(3);

  expect(
    storedEvents.map((event) => event.sequence)
  ).toEqual([1, 2, 3]);

  expect(storedRun[0].status).toBe("failed");

  expect(storedRun[0].error).toBe(
    "Fake generator failed"
  );
});