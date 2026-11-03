import { engineAnalysis, neuralAnalysis } from "@/lib/analysis";
import { ALGO_IDS } from "@/lib/meta";
import type { AnalysisPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as AnalysisPayload;
    const b = payload?.board;
    if (
      !b ||
      typeof b.cols !== "number" ||
      typeof b.rows !== "number" ||
      b.cols < 2 ||
      b.rows < 2 ||
      b.cols * b.rows > 250_000 ||
      !Array.isArray(b.walls) ||
      !Array.isArray(b.weights) ||
      !(ALGO_IDS as string[]).includes(payload.algo) ||
      !payload.result
    ) {
      return Response.json({ error: "invalid analysis payload" }, { status: 400 });
    }
    const base = engineAnalysis(payload);
    const result = await neuralAnalysis(payload, base);
    return Response.json({ analysis: result });
  } catch (err) {
    console.error("POST /api/analyze failed", err);
    return Response.json({ error: "analysis failed" }, { status: 500 });
  }
}