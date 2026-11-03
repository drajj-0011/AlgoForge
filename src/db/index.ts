import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { MongoClient, type Db } from "mongodb";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const mongoUrl = process.env.MONGODB_URI;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __algoForgeMongoClientPromise?: Promise<MongoClient>;
};

export type DatabaseKind = "mongodb" | "postgresql" | "none";

/** MongoDB takes priority when configured; PostgreSQL remains the preview fallback. */
export function databaseKind(): DatabaseKind {
  if (process.env.MONGODB_URI) return "mongodb";
  if (process.env.DATABASE_URL) return "postgresql";
  return "none";
}

if (databaseUrl && !globalForDb.__arenaNextJsPostgresqlPool) {
  globalForDb.__arenaNextJsPostgresqlPool = new Pool({
    connectionString: databaseUrl,
  });
}

export const pool = globalForDb.__arenaNextJsPostgresqlPool ?? null;
export const db = pool ? drizzle(pool) : null;

/** Lazily connects and reuses the client across Next.js development reloads. */
export async function getMongoDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required for the MongoDB backend");
  }
  if (!globalForDb.__algoForgeMongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    globalForDb.__algoForgeMongoClientPromise = client.connect().catch((error) => {
      globalForDb.__algoForgeMongoClientPromise = undefined;
      throw error;
    });
  }
  const client = await globalForDb.__algoForgeMongoClientPromise;
  return client.db(process.env.MONGODB_DB || "algoforge");
}

export async function pingDatabase(): Promise<void> {
  const kind = databaseKind();
  if (kind === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.command({ ping: 1 });
    return;
  }
  if (kind === "postgresql" && db) {
    await db.execute(sql`select 1`);
    return;
  }
  throw new Error("Set MONGODB_URI or DATABASE_URL in your .env file");
}