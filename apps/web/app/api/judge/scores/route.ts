import {
  audit,
  canScore,
  FINAL_SCORE_MAX,
  FINAL_SCORE_MIN,
  getCurrentHackathon,
  JudgingError,
  rateLimit,
  saveJudgeScores,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().min(1).max(100),
  entries: z
    .array(
      z.object({
        criterionId: z.string().min(1).max(100),
        score: z.number().int().min(FINAL_SCORE_MIN).max(FINAL_SCORE_MAX),
      })
    )
    .min(1)
    .max(20),
  teamNote: z.string().max(2000).nullish(),
  internalNote: z.string().max(2000).nullish(),
});

const STATUS: Record<JudgingError["code"], number> = {
  invalid_project: 404,
  out_of_track: 403,
  invalid_criteria: 400,
  invalid_order: 400,
};

/** PUT /api/judge/scores — juri menyimpan nilai 1..5 SEMUA kriteria juri untuk satu
 *  finalis + catatan. Hanya role judge: admin = panitia, inputnya lewat kriteria
 *  organizer di backoffice supaya tak pernah terhitung sebagai juri. */
export async function PUT(req: Request) {
  const auth = await requireAuth("judge");
  if (auth instanceof Response) return auth;

  const limit = await rateLimit(db, `judge:${auth.address}`, 60, 300);
  if (!limit.ok) return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon || !canScore(hackathon)) {
    return NextResponse.json({ error: "Penjurian sedang ditutup" }, { status: 409 });
  }

  try {
    const res = await saveJudgeScores(db, {
      hackathonId: hackathon.id,
      projectId: parsed.data.projectId,
      judge: auth.address,
      entries: parsed.data.entries,
      teamNote: parsed.data.teamNote,
      internalNote: parsed.data.internalNote,
    });
    await audit(db, {
      actor: auth.address,
      action: "judge.score",
      target: parsed.data.projectId,
      // Isi catatan tak disalin ke audit (sudah di judge_notes); cukup penandanya.
      detail: {
        name: res.name,
        entries: parsed.data.entries,
        teamNote: Boolean(parsed.data.teamNote?.trim()),
        internalNote: Boolean(parsed.data.internalNote?.trim()),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof JudgingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: STATUS[e.code] });
    }
    throw e;
  }
}
