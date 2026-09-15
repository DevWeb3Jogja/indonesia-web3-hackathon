import { clientIp, verifyTurnstile } from "@iw3h/auth";
import { castVote, getCurrentHackathon, rateLimit, VoteError } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const body = z.object({ projectId: z.string().min(1).max(64) });

const STATUS: Record<VoteError["code"], number> = {
  voting_closed: 409,
  not_finalist: 400,
  not_eligible: 403,
};

/** POST /api/vote — pilih 1 project finalis. Alamat SELALU dari session. */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  // Turnstile: satu lapis lagi anti-bot sebelum menulis.
  if (!(await verifyTurnstile(req.headers.get("x-turnstile-token"), clientIp(req)))) {
    return NextResponse.json({ error: "Verifikasi anti-bot gagal" }, { status: 403 });
  }
  const limit = await rateLimit(db, `vote:${auth.address}`, 20);
  if (!limit.ok) {
    return NextResponse.json({ error: "Terlalu sering, coba lagi sebentar" }, { status: 429 });
  }

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "Tidak ada hackathon aktif" }, { status: 409 });

  try {
    const res = await castVote(db, hackathon.id, auth.address, auth.role, parsed.data.projectId);
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof VoteError)
      return NextResponse.json({ error: e.message }, { status: STATUS[e.code] });
    throw e;
  }
}
