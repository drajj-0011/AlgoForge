import { databaseKind, pingDatabase } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingDatabase();
    return Response.json({ ok: true, database: databaseKind() });
  } catch (err) {
    console.error("GET /api/health failed", err);
    return Response.json(
      { ok: false, database: databaseKind(), error: "database unavailable" },
      { status: 500 },
    );
  }
}