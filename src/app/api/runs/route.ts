import { createRun, listRuns } from "@/db/runs";
import { ALGO_IDS } from "@/lib/meta";
import type { RunRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const records = await listRuns();
    return Response.json({ runs: records });
  } catch (err) {
    console.error("GET /api/runs failed", err);
    return Response.json({ error: "run ledger unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<RunRecord>;
    if (
      typeof body.algorithm !== "string" ||
      !(ALGO_IDS as string[]).includes(body.algorithm) ||
      typeof body.visited !== "number" ||
      typeof body.cols !== "number" ||
      typeof body.rows !== "number"
    ) {
      return Response.json({ error: "invalid run payload" }, { status: 400 });
    }
    const record = await createRun({
      algorithm: body.algorithm,
      heuristic: String(body.heuristic ?? "manhattan").slice(0, 24),
      cols: Math.max(1, Math.min(500, body.cols | 0)),
      rows: Math.max(1, Math.min(500, body.rows | 0)),
      maze: String(body.maze ?? "none").slice(0, 24),
      wallCount: Math.max(0, (body.wallCount ?? 0) | 0),
      visited: Math.max(0, body.visited | 0),
      pathLength: Math.max(0, (body.pathLength ?? 0) | 0),
      pathCost: Math.max(0, Number(body.pathCost ?? 0)),
      computeMs: Math.max(0, Number(body.computeMs ?? 0)),
      efficiency: Math.max(0, Math.min(100, Number(body.efficiency ?? 0))),
      pilot: (String(body.pilot ?? "you").trim() || "you").slice(0, 24),
    });
    return Response.json({ run: record }, { status: 201 });
  } catch (err) {
    console.error("POST /api/runs failed", err);
    return Response.json({ error: "could not log run" }, { status: 500 });
  }
}