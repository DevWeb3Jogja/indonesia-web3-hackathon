import { getCurrentHackathon, leaveTeam, rateLimit, TeamError } from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const limit = await rateLimit(db, `team-leave:${auth.address}`, 10);
  if (!limit.ok) {
    return NextResponse.json({ error: "Terlalu sering, coba lagi sebentar" }, { status: 429 });
  }

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "Tidak ada hackathon aktif" }, { status: 409 });

  try {
    await leaveTeam(db, hackathon.id, auth.address);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof TeamError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
