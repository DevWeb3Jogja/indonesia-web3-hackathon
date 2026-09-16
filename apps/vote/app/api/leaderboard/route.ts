import { DEMO_HACKATHON_ID, getCurrentHackathon, voteLeaderboard } from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** GET /api/leaderboard — admin selalu boleh; selain itu hanya kalau sudah publik.
 *  ?demo=1 (admin saja) → leaderboard edisi demo. */
export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  // Demo HANYA admin: leaderboard edisi demo.
  if (new URL(req.url).searchParams.get("demo") === "1" && auth.role === "admin") {
    return NextResponse.json({ rows: await voteLeaderboard(db, DEMO_HACKATHON_ID) });
  }

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "Tidak ada hackathon aktif" }, { status: 409 });

  if (auth.role !== "admin" && !hackathon.leaderboardPublic) {
    return NextResponse.json({ error: "Leaderboard belum dibuka" }, { status: 403 });
  }
  return NextResponse.json({ rows: await voteLeaderboard(db, hackathon.id) });
}
