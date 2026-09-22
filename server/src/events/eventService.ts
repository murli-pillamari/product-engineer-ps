import { and, asc, eq, gt } from "drizzle-orm";

import { db } from "../db";
import { events, runs } from "../db/schema";

export async function getEventsAfter(
  runId: string,
  afterSequence: number
) {
  return db
    .select()
    .from(events)
    .where(
      and(
        eq(events.runId, runId),
        gt(events.sequence, afterSequence)
      )
    )
    .orderBy(asc(events.sequence));
}

export async function getRun(runId: string) {
  const result = await db
    .select()
    .from(runs)
    .where(eq(runs.id, runId))
    .limit(1);

  return result[0] ?? null;
}