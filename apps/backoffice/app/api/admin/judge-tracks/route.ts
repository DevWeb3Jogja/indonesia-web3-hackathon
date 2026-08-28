import { audit, getCurrentHackathon, getUser, setJudgeTracks } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  judgeAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  trackIds: z.array(z.string().min(1)).max(20),
});

export async function PUT(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "Tidak ada hackathon" }, { status: 404 });

  const target = await getUser(db, parsed.data.judgeAddress);
  if (!target || (target.role !== "judge" && target.role !== "admin")) {
    return NextResponse.json({ error: "User bukan juri" }, { status: 409 });
  }

  await setJudgeTracks(db, hackathon.id, parsed.data.judgeAddress, parsed.data.trackIds);
  await audit(db, {
    actor: auth.address,
    action: "judge.tracks",
    target: parsed.data.judgeAddress,
    detail: { tracks: parsed.data.trackIds },
  });
  return NextResponse.json({ ok: true });
}
