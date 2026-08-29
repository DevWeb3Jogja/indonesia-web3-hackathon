import {
  canSubmitProject,
  getCurrentHackathon,
  getMyTeam,
  getProjectForUser,
  getUser,
  isProfileComplete,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ project: null, hasTeam: false, canSubmit: false });

  const [project, team, user] = await Promise.all([
    getProjectForUser(db, hackathon.id, auth.address),
    getMyTeam(db, hackathon.id, auth.address),
    getUser(db, auth.address),
  ]);
  return NextResponse.json({
    project,
    hasTeam: Boolean(team),
    teamName: team?.name ?? null,
    canSubmit: canSubmitProject(hackathon),
    profileComplete: isProfileComplete(user),
  });
}
