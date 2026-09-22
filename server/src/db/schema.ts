import {
  sqliteTable,
  text,
  integer,
  unique,
} from "drizzle-orm/sqlite-core";

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),

  createdAt: integer("created_at", {
    mode: "timestamp",
  }).notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),

  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),

  userMessageId: text("user_message_id").notNull(),

  status: text("status", {
    enum: ["running", "completed", "failed", "interrupted"],
  })
    .notNull()
    .default("running"),

  error: text("error"),

  createdAt: integer("created_at", {
    mode: "timestamp",
  }).notNull(),

  completedAt: integer("completed_at", {
    mode: "timestamp",
  }),
});

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),

    runId: text("run_id")
      .notNull()
      .references(() => runs.id),

    sequence: integer("sequence").notNull(),

    type: text("type").notNull(),

    payload: text("payload").notNull(),

    createdAt: integer("created_at", {
      mode: "timestamp",
    }).notNull(),
  },

  (table) => ({
    runSequenceUnique: unique("run_sequence_unique").on(
      table.runId,
      table.sequence
    ),
  })
);