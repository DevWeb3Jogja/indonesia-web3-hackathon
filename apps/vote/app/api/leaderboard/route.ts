import { DEMO_HACKATHON_ID, getCurrentHackathon, voteLeaderboard } from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** GET /api/leaderboard — angka per project, KHUSUS ADMIN (hasil diumumkan panitia di
 *  panggung). Tak ada lagi mode "publik": kolom leaderboard_public diabaikan.
 *  ?demo=1 → leaderboard edisi demo. */
export async function GET(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  if (new URL(req.url).searchParams.get("demo") === "1") {
    return NextResponse.json({ rows: await voteLeaderboard(db, DEMO_HACKATHON_ID) });
  }

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "Tidak ada hackathon aktif" }, { status: 409 });
  return NextResponse.json({ rows: await voteLeaderboard(db, hackathon.id) });
}
