import { audit, clearWinner, getProjectById, setWinner } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  prizeId: z.string().min(1),
  projectId: z.string().min(1).nullable(), // null = hapus pemenang
});

export async function PUT(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  const { prizeId, projectId } = parsed.data;

  if (projectId === null) {
    await clearWinner(db, prizeId);
    await audit(db, { actor: auth.address, action: "winner.clear", target: prizeId });
    return NextResponse.json({ ok: true });
  }

  const project = await getProjectById(db, projectId);
  if (project?.status !== "submitted") {
    return NextResponse.json({ error: "Project tidak valid" }, { status: 404 });
  }
  await setWinner(db, prizeId, projectId);
  await audit(db, {
    actor: auth.address,
    action: "winner.set",
    target: prizeId,
    detail: { projectId, name: project.name },
  });
  return NextResponse.json({ ok: true });
}
