import {
  canScore,
  getCurrentHackathon,
  getJudgeNotes,
  getJudgeScores,
  listJudgeCriteria,
  listJudgeFinalists,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** GET /api/judge/data — form juri: finalis demo day (sesuai track juri), kriteria juri
 *  (kriteria panitia disembunyikan), dan HANYA nilai/catatan milik juri yang login.
 *  Admin boleh melihat (pratinjau) tapi tak bisa menyimpan (lihat PUT /api/judge/scores). */
export async function GET() {
  const auth = await requireAuth("judge", "admin");
  if (auth instanceof Response) return auth;

  const readOnly = auth.role !== "judge";
  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) {
    return NextResponse.json({
      criteria: [],
      projects: [],
      scores: {},
      notes: {},
      canScore: false,
      readOnly,
    });
  }

  const [criteria, projects, myScores, myNotes] = await Promise.all([
    listJudgeCriteria(db, hackathon.id),
    listJudgeFinalists(db, hackathon.id, auth.address),
    getJudgeScores(db, hackathon.id, auth.address),
    getJudgeNotes(db, hackathon.id, auth.address),
  ]);

  // { [projectId]: { [criterionId]: score } } — nilai lama untuk kriteria yang kini bukan
  // kriteria juri tak dikirim (form hanya mengenal kriteria juri).
  const judgeCrit = new Set(criteria.map((c) => c.id));
  const scores: Record<string, Record<string, number>> = {};
  // Catatan lama (sebelum judge_notes) tersimpan di scores.comment → dipakai sebagai fallback.
  const legacyComment: Record<string, string> = {};
  for (const s of myScores) {
    if (s.comment && !legacyComment[s.projectId]) legacyComment[s.projectId] = s.comment;
    // Nilai lama skala 1..10 (form sebelum babak final) tak dipakai → form tampil kosong.
    if (!judgeCrit.has(s.criterionId) || s.score < 1 || s.score > 5) continue;
    if (!scores[s.projectId]) scores[s.projectId] = {};
    scores[s.projectId][s.criterionId] = s.score;
  }
  const notes: Record<string, { teamNote: string | null; internalNote: string | null }> = {};
  for (const [projectId, comment] of Object.entries(legacyComment)) {
    // Form lama tak menjelaskan siapa pembacanya → anggap internal, jangan sampai ke tim.
    notes[projectId] = { teamNote: null, internalNote: comment };
  }
  for (const n of myNotes) {
    notes[n.projectId] = { teamNote: n.teamNote, internalNote: n.internalNote };
  }

  return NextResponse.json({
    criteria,
    projects,
    scores,
    notes,
    canScore: canScore(hackathon),
    readOnly,
  });
}
