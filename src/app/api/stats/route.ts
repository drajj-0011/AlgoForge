import { getLabStats } from "@/db/runs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getLabStats();
    return Response.json({ stats });
  } catch (err) {
    console.error("GET /api/stats failed", err);
    return Response.json({ error: "stats unavailable" }, { status: 500 });
  }
}