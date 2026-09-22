import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";

import { db } from "../db";
import { conversations, events, runs } from "../db/schema";
import { getEventsAfter } from "../events/eventService";

describe("eventService", () => {
  beforeEach(async () => {
    await db.delete(events);
    await db.delete(runs);
    await db.delete(conversations);
  });

  it("returns only events after the client cursor in order", async () => {
    const conversationId = randomUUID();
    const runId = randomUUID();

    await db.insert(conversations).values({
      id: conversationId,
      createdAt: new Date(),
    });

    await db.insert(runs).values({
      id: runId,
      conversationId,
      userMessageId: randomUUID(),
      status: "running",
      createdAt: new Date(),
    });

    for (let sequence = 1; sequence <= 5; sequence++) {
      await db.insert(events).values({
        id: randomUUID(),
        runId,
        sequence,
        type: "text_delta",
        payload: JSON.stringify({
          text: `chunk-${sequence}`,
        }),
        createdAt: new Date(),
      });
    }

    const replayedEvents = await getEventsAfter(
      runId,
      3
    );

    expect(
      replayedEvents.map((event) => event.sequence)
    ).toEqual([4, 5]);
  });
});