import { audit, getCurrentHackathon, setVotingSettings } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

// strict: field lama `leaderboardPublic` DITOLAK (400), bukan diam-diam diabaikan —
// hasil per project kini selalu khusus admin, tak ada lagi mode publik.
const schema = z.object({ votingOpen: z.boolean() }).strict();

/** PUT /api/admin/vote-settings — buka/tutup voting Community Choice. */
export async function PUT(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "No hackathon" }, { status: 404 });

  await setVotingSettings(db, hackathon.id, parsed.data);
  await audit(db, {
    actor: auth.address,
    action: "vote.settings",
    target: hackathon.id,
    detail: parsed.data,
  });
  return NextResponse.json({ ok: true });
}
