import {
  audit,
  FINAL_SCORE_MAX,
  FINAL_SCORE_MIN,
  getCurrentHackathon,
  isFrozen,
  setOrganizerScore,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { judgingErrorResponse } from "@/lib/judging";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().min(1).max(100),
  criterionId: z.string().min(1).max(100),
  // null = kosongkan nilai.
  score: z.number().int().min(FINAL_SCORE_MIN).max(FINAL_SCORE_MAX).nullable(),
});

/** PUT /api/admin/judging/organizer-score — ADMIN mengisi kriteria panitia (mis.
 *  Participation) 1..5 untuk satu finalis. Disimpan terpisah dari nilai juri. */
export async function PUT(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "No hackathon" }, { status: 404 });
  // Setelah completed, nilai beku permanen (sama seperti nilai juri & pemenang).
  if (isFrozen(hackathon)) {
    return NextResponse.json({ error: "Hackathon sudah selesai — nilai beku" }, { status: 409 });
  }

  try {
    const res = await setOrganizerScore(db, {
      hackathonId: hackathon.id,
      actor: auth.address,
      ...parsed.data,
    });
    await audit(db, {
      actor: auth.address,
      action:
        parsed.data.score === null ? "judging.organizer_score.clear" : "judging.organizer_score",
      target: parsed.data.projectId,
      detail: { name: res.name, criterion: res.criterion, score: parsed.data.score },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return judgingErrorResponse(e);
  }
}
