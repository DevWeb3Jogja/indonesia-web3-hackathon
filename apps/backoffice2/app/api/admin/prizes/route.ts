import {
  audit,
  ConfigError,
  createPrize,
  getCurrentHackathon,
  listPrizes,
  listTracks,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  trackId: z.string().min(1).nullish(),
  amountUsd: z.number().int().min(0).max(100_000_000).nullish(),
  sponsor: z.string().trim().max(120).nullish(),
  sort: z.number().int().min(0).max(9999).optional(),
});

/** trackId (kalau diisi) wajib milik hackathon ini — cegah prize nyasar ke track edisi lain. */
async function validTrack(hackathonId: string, trackId?: string | null): Promise<boolean> {
  if (!trackId) return true;
  const tracks = await listTracks(db, hackathonId);
  return tracks.some((t) => t.id === trackId);
}

export async function GET() {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: await listPrizes(db, hackathon.id) });
}

export async function POST(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "No hackathon" }, { status: 404 });
  if (!(await validTrack(hackathon.id, parsed.data.trackId))) {
    return NextResponse.json({ error: "Invalid track" }, { status: 400 });
  }

  try {
    const { id } = await createPrize(db, hackathon.id, parsed.data);
    await audit(db, {
      actor: auth.address,
      action: "prize.create",
      target: id,
      detail: parsed.data,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (e instanceof ConfigError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
