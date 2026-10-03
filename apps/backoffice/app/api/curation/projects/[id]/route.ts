import { getCurrentHackathon, getProjectById, getPublicProfiles } from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** GET /api/curation/projects/:id — isi submission untuk penilai kurasi.
 *  TANPA data pribadi anggota (email/HP/nama lengkap/kota): panitia mitra tak butuh,
 *  versi lengkap tetap admin-only di /api/admin/projects/:id. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth("admin", "panitia");
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const hackathon = await getCurrentHackathon(db);
  const project = await getProjectById(db, id);
  if (!hackathon || project?.status !== "submitted" || project.hackathonId !== hackathon.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const addrs = project.team ? project.team.memberAddresses : [project.submitterAddress];
  const profiles = await getPublicProfiles(db, addrs);
  const members = addrs.map((address) => {
    const p = profiles.find((x) => x.address === address);
    return {
      address,
      username: p?.username ?? null,
      fullName: null,
      email: null,
      phone: null,
      city: null,
      occupation: null,
      organization: null,
      githubLogin: null,
      twitterUrl: null,
      role: null,
      isSubmitter: address === project.submitterAddress,
    };
  });

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      tagline: project.tagline ?? null,
      status: project.status,
      trackIds: project.trackIds,
      team: project.team ? { name: project.team.name } : null,
      githubUrl: project.githubUrl ?? null,
      demoUrl: project.demoUrl ?? null,
      demoVideoUrl: project.demoVideoUrl ?? null,
      extraLinks: project.extraLinks ?? null,
      contractAddress: project.contractAddress ?? null,
      network: project.network ?? null,
      problemStatement: project.problemStatement ?? null,
      solution: project.solution ?? null,
      description: project.description ?? null,
      submittedAt: project.submittedAt,
      createdAt: project.createdAt,
    },
    members,
  });
}
