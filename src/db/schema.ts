import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";

/** One completed pathfinding run, logged to the public run ledger. */
export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  algorithm: text("algorithm").notNull(),
  heuristic: text("heuristic").notNull().default("manhattan"),
  cols: integer("cols").notNull(),
  rows: integer("rows").notNull(),
  maze: text("maze").notNull().default("none"),
  wallCount: integer("wall_count").notNull().default(0),
  visited: integer("visited").notNull(),
  pathLength: integer("path_length").notNull(),
  pathCost: doublePrecision("path_cost").notNull(),
  computeMs: doublePrecision("compute_ms").notNull(),
  efficiency: doublePrecision("efficiency").notNull(),
  pilot: text("pilot").notNull().default("you"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type RunRow = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;