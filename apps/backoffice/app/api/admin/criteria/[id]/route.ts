import { audit, deleteCriterion, getCurrentHackathon, updateCriterion } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { configErrorResponse } from "@/lib/config-error";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(500).nullish(),
    weight: z.number().int().min(1).max(100),
    sort: z.number().int().min(0).max(9999),
  })
  .partial();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "Tidak ada hackathon" }, { status: 404 });

  try {
    await updateCriterion(db, hackathon.id, id, parsed.data);
    await audit(db, {
      actor: auth.address,
      action: "criterion.update",
      target: id,
      detail: parsed.data,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return configErrorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "Tidak ada hackathon" }, { status: 404 });

  try {
    await deleteCriterion(db, hackathon.id, id);
    await audit(db, { actor: auth.address, action: "criterion.delete", target: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return configErrorResponse(e);
  }
}
