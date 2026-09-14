import { getCurrentHackathon, listParticipantsForExport } from "@iw3h/db";
import { requireAuth } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** GET /api/admin/users/export — CSV lengkap semua peserta + tahap funnel. */
export async function GET() {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return new Response("No hackathon", { status: 404 });

  const parts = await listParticipantsForExport(db, hackathon.id);
  const stageLabel: Record<string, string> = {
    connected: "Just connected",
    profileStarted: "Profile started",
    profileComplete: "Profile complete",
    team: "In a team",
    submitted: "Submitted",
  };

  const headers = [
    "Address",
    "Stage",
    "Full Name",
    "Username",
    "Email",
    "Phone",
    "City",
    "Affiliation",
    "Organization",
    "GitHub",
    "X / Twitter",
    "Role",
    "Team",
    "Project",
    "Bio",
    "Joined",
  ];

  const rows = parts.map((u) => [
    u.address,
    stageLabel[u.stage] ?? u.stage,
    u.fullName,
    u.username,
    u.email,
    u.phone,
    u.city,
    u.occupation,
    u.organization,
    u.githubLogin ? `https://github.com/${u.githubLogin}` : (u.githubUrl ?? ""),
    u.twitterUrl,
    u.role,
    u.teamName,
    u.projectName,
    u.bio,
    u.createdAt,
  ]);

  return csvResponse("iw3h-participants", toCsv(headers, rows));
}
