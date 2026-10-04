import { finalJudgingBoard, getCurrentHackathon } from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** GET /api/admin/judging — ADMIN: rekap penjurian final (dipoll halaman /judging).
 *  Rahasia: berisi nilai, peringkat, dan catatan internal juri. */
export async function GET() {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ criteria: [], judges: [], rows: [] });
  return NextResponse.json(await finalJudgingBoard(db, hackathon.id), {
    headers: { "cache-control": "no-store" },
  });
}
