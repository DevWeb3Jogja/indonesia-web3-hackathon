import { audit, getProjectById, markDemoDay } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({ demoDay: z.boolean() });

/** PUT /api/admin/projects/:id/demo-day — tandai/lepas finalis demo day (kandidat vote). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const project = await getProjectById(db, id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await markDemoDay(db, id, parsed.data.demoDay);
  await audit(db, {
    actor: auth.address,
    action: parsed.data.demoDay ? "project.demo_day.add" : "project.demo_day.remove",
    target: id,
    detail: { name: project.name },
  });
  return NextResponse.json({ ok: true, demoDay: parsed.data.demoDay });
}
