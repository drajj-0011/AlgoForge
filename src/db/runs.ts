import { desc, eq, sql } from "drizzle-orm";
import { db, databaseKind, getMongoDb } from "./index";
import { runs, type RunRow } from "./schema";
import { ALGO_IDS } from "@/lib/meta";
import { seedRuns } from "@/lib/seed";
import type { AlgoId, LabStats, RunRecord } from "@/lib/types";

export interface RunInput {
  algorithm: string;
  heuristic: string;
  cols: number;
  rows: number;
  maze: string;
  wallCount: number;
  visited: number;
  pathLength: number;
  pathCost: number;
  computeMs: number;
  efficiency: number;
  pilot: string;
  createdAt?: Date;
}

interface RunValues {
  id: number;
  algorithm: string;
  heuristic: string;
  cols: number;
  rows: number;
  maze: string;
  wallCount: number;
  visited: number;
  pathLength: number;
  pathCost: number;
  computeMs: number;
  efficiency: number;
  pilot: string;
  createdAt: Date;
}

interface RunDocument {
  _id: number;
  algorithm: string;
  heuristic: string;
  cols: number;
  rows: number;
  maze: string;
  wallCount: number;
  visited: number;
  pathLength: number;
  pathCost: number;
  computeMs: number;
  efficiency: number;
  pilot: string;
  createdAt: Date;
}

interface CounterDocument {
  _id: string;
  seq: number;
}

function normalizeAlgorithm(value: string): AlgoId {
  return (ALGO_IDS as string[]).includes(value) ? (value as AlgoId) : "astar";
}

function toRecord(row: RunValues): RunRecord {
  return {
    id: row.id,
    algorithm: normalizeAlgorithm(row.algorithm),
    heuristic: row.heuristic,
    cols: row.cols,
    rows: row.rows,
    maze: row.maze,
    wallCount: row.wallCount,
    visited: row.visited,
    pathLength: row.pathLength,
    pathCost: row.pathCost,
    computeMs: row.computeMs,
    efficiency: row.efficiency,
    pilot: row.pilot,
    createdAt: row.createdAt.toISOString(),
  };
}

function fromPostgres(row: RunRow): RunValues {
  return row;
}

function fromMongo(document: RunDocument): RunValues {
  return {
    id: document._id,
    algorithm: document.algorithm,
    heuristic: document.heuristic,
    cols: document.cols,
    rows: document.rows,
    maze: document.maze,
    wallCount: document.wallCount,
    visited: document.visited,
    pathLength: document.pathLength,
    pathCost: document.pathCost,
    computeMs: document.computeMs,
    efficiency: document.efficiency,
    pilot: document.pilot,
    createdAt: document.createdAt,
  };
}

function mongoDocument(id: number, input: RunInput): RunDocument {
  return {
    _id: id,
    algorithm: input.algorithm,
    heuristic: input.heuristic,
    cols: input.cols,
    rows: input.rows,
    maze: input.maze,
    wallCount: input.wallCount,
    visited: input.visited,
    pathLength: input.pathLength,
    pathCost: input.pathCost,
    computeMs: input.computeMs,
    efficiency: input.efficiency,
    pilot: input.pilot,
    createdAt: input.createdAt ?? new Date(),
  };
}

async function seedMongo(): Promise<void> {
  const mongo = await getMongoDb();
  const collection = mongo.collection<RunDocument>("runs");
  if ((await collection.countDocuments()) > 0) return;
  const documents = seedRuns().map((run, index) =>
    mongoDocument(index + 1, {
      ...run,
      heuristic: run.heuristic ?? "manhattan",
      maze: run.maze ?? "none",
      wallCount: run.wallCount ?? 0,
      pilot: run.pilot ?? "you",
    }),
  );
  if (documents.length > 0) {
    await collection.insertMany(documents);
    await collection.createIndex({ createdAt: -1 });
    await mongo.collection<CounterDocument>("counters").updateOne(
      { _id: "runs" },
      { $set: { seq: documents.length } },
      { upsert: true },
    );
  }
}

async function seedPostgres(): Promise<void> {
  if (!db) throw new Error("DATABASE_URL is required for the PostgreSQL backend");
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(runs);
  if (count === 0) await db.insert(runs).values(seedRuns());
}

let seedPromise: Promise<void> | null = null;
async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (databaseKind() === "mongodb" ? seedMongo() : seedPostgres()).catch(
      (error) => {
        seedPromise = null;
        throw error;
      },
    );
  }
  await seedPromise;
}

export async function listRuns(): Promise<RunRecord[]> {
  await ensureSeeded();
  if (databaseKind() === "mongodb") {
    const mongo = await getMongoDb();
    const documents = await mongo
      .collection<RunDocument>("runs")
      .find()
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
    return documents.map((document) => toRecord(fromMongo(document)));
  }
  if (!db) throw new Error("No database is configured");
  const rows = await db.select().from(runs).orderBy(desc(runs.createdAt)).limit(200);
  return rows.map((row) => toRecord(fromPostgres(row)));
}

export async function createRun(input: RunInput): Promise<RunRecord> {
  await ensureSeeded();
  if (databaseKind() === "mongodb") {
    const mongo = await getMongoDb();
    const counter = await mongo
      .collection<CounterDocument>("counters")
      .findOneAndUpdate(
        { _id: "runs" },
        { $inc: { seq: 1 } },
        {
          upsert: true,
          returnDocument: "after",
          includeResultMetadata: false,
        },
      );
    if (!counter) throw new Error("Could not allocate a run id");
    const document = mongoDocument(counter.seq, input);
    await mongo.collection<RunDocument>("runs").insertOne(document);
    return toRecord(fromMongo(document));
  }
  if (!db) throw new Error("No database is configured");
  const [row] = await db.insert(runs).values(input).returning();
  return toRecord(fromPostgres(row));
}

export async function deleteRunById(id: number): Promise<void> {
  if (databaseKind() === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection<RunDocument>("runs").deleteOne({ _id: id });
    return;
  }
  if (!db) throw new Error("No database is configured");
  await db.delete(runs).where(eq(runs.id, id));
}

export async function getLabStats(): Promise<LabStats> {
  await ensureSeeded();
  if (databaseKind() === "mongodb") {
    const mongo = await getMongoDb();
    const rows = await mongo
      .collection<RunDocument>("runs")
      .aggregate<{
        _id: null;
        totalRuns: number;
        nodesExplored: number;
        avgEfficiency: number | null;
        bestCost: number | null;
      }>([
        {
          $group: {
            _id: null,
            totalRuns: { $sum: 1 },
            nodesExplored: { $sum: "$visited" },
            avgEfficiency: { $avg: "$efficiency" },
            bestCost: {
              $min: {
                $cond: [{ $gt: ["$pathLength", 0] }, "$pathCost", null],
              },
            },
          },
        },
      ])
      .toArray();
    const row = rows[0];
    return {
      totalRuns: row?.totalRuns ?? 0,
      nodesExplored: row?.nodesExplored ?? 0,
      avgEfficiency: Math.round((row?.avgEfficiency ?? 0) * 10) / 10,
      bestCost: Math.round((row?.bestCost ?? 0) * 10) / 10,
    };
  }
  if (!db) throw new Error("No database is configured");
  const [row] = await db
    .select({
      totalRuns: sql<number>`count(*)::int`,
      nodesExplored: sql<number>`coalesce(sum(${runs.visited}), 0)::int`,
      avgEfficiency: sql<number>`coalesce(avg(${runs.efficiency}), 0)::float`,
      bestCost: sql<number>`coalesce(min(case when ${runs.pathLength} > 0 then ${runs.pathCost} end), 0)::float`,
    })
    .from(runs);
  return {
    totalRuns: row.totalRuns,
    nodesExplored: row.nodesExplored,
    avgEfficiency: Math.round(row.avgEfficiency * 10) / 10,
    bestCost: Math.round(row.bestCost * 10) / 10,
  };
}