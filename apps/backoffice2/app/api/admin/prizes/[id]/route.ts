import { audit, deletePrize, getCurrentHackathon, listTracks, updatePrize } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { configErrorResponse } from "@/lib/config-error";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    name: z.string().trim().min(2).max(120),
    trackId: z.string().min(1).nullish(),
    amountUsd: z.number().int().min(0).max(100_000_000).nullish(),
    sponsor: z.string().trim().max(120).nullish(),
    sort: z.number().int().min(0).max(9999),
  })
  .partial();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "No hackathon" }, { status: 404 });
  if (parsed.data.trackId) {
    const tracks = await listTracks(db, hackathon.id);
    if (!tracks.some((t) => t.id === parsed.data.trackId)) {
      return NextResponse.json({ error: "Invalid track" }, { status: 400 });
    }
  }

  try {
    await updatePrize(db, hackathon.id, id, parsed.data);
    await audit(db, {
      actor: auth.address,
      action: "prize.update",
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
  if (!hackathon) return NextResponse.json({ error: "No hackathon" }, { status: 404 });

  try {
    await deletePrize(db, hackathon.id, id);
    await audit(db, { actor: auth.address, action: "prize.delete", target: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return configErrorResponse(e);
  }
}
