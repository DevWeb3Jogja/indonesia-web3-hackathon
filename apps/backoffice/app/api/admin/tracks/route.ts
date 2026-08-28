import { audit, ConfigError, createTrack, getCurrentHackathon, listTracks } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullish(),
  sort: z.number().int().min(0).max(9999).optional(),
});

export async function GET() {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: await listTracks(db, hackathon.id) });
}

export async function POST(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "Tidak ada hackathon" }, { status: 404 });

  try {
    const { id } = await createTrack(db, hackathon.id, parsed.data);
    await audit(db, {
      actor: auth.address,
      action: "track.create",
      target: id,
      detail: parsed.data,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (e instanceof ConfigError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
