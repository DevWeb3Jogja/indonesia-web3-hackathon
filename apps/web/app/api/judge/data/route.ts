import {
  canScore,
  getCurrentHackathon,
  getJudgeScores,
  getJudgeTracks,
  listCriteria,
  listSubmittedProjects,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth("judge", "admin");
  if (auth instanceof Response) return auth;

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon)
    return NextResponse.json({ criteria: [], projects: [], scores: {}, canScore: false });

  const [criteria, allProjects, myScores, judgeTracks] = await Promise.all([
    listCriteria(db, hackathon.id),
    listSubmittedProjects(db, hackathon.id),
    getJudgeScores(db, hackathon.id, auth.address),
    getJudgeTracks(db, hackathon.id, auth.address),
  ]);

  // Juri hanya menilai track yang di-assign; tanpa assignment = boleh semua.
  const projects =
    judgeTracks.length === 0
      ? allProjects
      : allProjects.filter((p) => p.trackIds.some((id) => judgeTracks.includes(id)));

  // { [projectId]: { [criterionId]: {score, comment} } }
  const scores: Record<string, Record<string, { score: number; comment: string | null }>> = {};
  for (const s of myScores) {
    if (!scores[s.projectId]) scores[s.projectId] = {};
    scores[s.projectId][s.criterionId] = { score: s.score, comment: s.comment };
  }

  return NextResponse.json({
    criteria: criteria.map((c) => ({ id: c.id, name: c.name, weight: c.weight })),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      teamName: p.team?.name ?? null,
      trackIds: p.trackIds,
    })),
    scores,
    canScore: canScore(hackathon),
  });
}
