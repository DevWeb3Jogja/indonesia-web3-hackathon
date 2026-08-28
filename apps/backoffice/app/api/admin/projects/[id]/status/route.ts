import { audit, getProjectById, setProjectStatus } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["submitted", "disqualified"]) });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });

  const project = await getProjectById(db, id);
  if (!project) return NextResponse.json({ error: "Project tidak ditemukan" }, { status: 404 });

  await setProjectStatus(db, id, parsed.data.status);
  await audit(db, {
    actor: auth.address,
    action: parsed.data.status === "disqualified" ? "project.disqualify" : "project.reinstate",
    target: id,
    detail: { name: project.name, from: project.status, to: parsed.data.status },
  });
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
