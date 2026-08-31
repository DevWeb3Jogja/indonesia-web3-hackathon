import { adminEditProject, audit, deleteProject, getProjectById } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const editSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(140).nullish(),
});

/** Admin edit nama & tagline project. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const project = await getProjectById(db, id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await adminEditProject(db, id, { name: parsed.data.name, tagline: parsed.data.tagline ?? null });
  await audit(db, {
    actor: auth.address,
    action: "project.edit",
    target: id,
    detail: { from: { name: project.name, tagline: project.tagline }, to: parsed.data },
  });
  return NextResponse.json({ ok: true });
}

/** Admin hapus permanen project. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const project = await getProjectById(db, id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await deleteProject(db, id);
  await audit(db, {
    actor: auth.address,
    action: "project.delete",
    target: id,
    detail: { name: project.name },
  });
  return NextResponse.json({ ok: true });
}
