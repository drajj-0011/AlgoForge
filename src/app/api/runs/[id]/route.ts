import { deleteRunById } from "@/db/runs";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numeric = Number.parseInt(id, 10);
    if (!Number.isFinite(numeric)) {
      return Response.json({ error: "invalid id" }, { status: 400 });
    }
    await deleteRunById(numeric);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/runs/[id] failed", err);
    return Response.json({ error: "could not delete run" }, { status: 500 });
  }
}