import { getCurrentHackathon, getUsersByAddresses, listAllProjects } from "@iw3h/db";
import { requireAuth } from "@/lib/auth";
import { csvResponse, extraLink, toCsv } from "@/lib/csv";
import { db } from "@/lib/turso";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

/** GET /api/admin/projects/export[?format=xlsx] — export lengkap semua project +
 *  detail anggota. Default CSV; format=xlsx → Excel terformat. */
export async function GET(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return new Response("No hackathon", { status: 404 });

  const projects = await listAllProjects(db, hackathon.id);
  const addrs = [
    ...new Set(projects.flatMap((p) => (p.team ? p.team.memberAddresses : [p.submitterAddress]))),
  ];
  const users = await getUsersByAddresses(db, addrs);

  const headers = [
    "Project",
    "Tagline",
    "Tracks",
    "Type",
    "Team",
    "Status",
    "Submitted At",
    "Members",
    "Member Emails",
    "Member Phones",
    "Member Cities",
    "Member Affiliations",
    "GitHub",
    "Website",
    "Demo Video",
    "Pitch Deck",
    "X",
    "LinkedIn",
    "Contract",
    "Network",
    "Problem",
    "Solution",
    "Description",
  ];

  const rows = projects.map((p) => {
    const members = p.team ? p.team.memberAddresses : [p.submitterAddress];
    const mu = members.map((a) => users.get(a)).filter((u) => u !== undefined);
    return [
      p.name,
      p.tagline,
      p.trackIds.join(" | "),
      p.team ? "Team" : "Solo",
      p.team?.name ?? "",
      p.status,
      p.submittedAt,
      mu.map((u) => u.fullName || u.username || u.address).join("; "),
      mu.map((u) => u.email ?? "").join("; "),
      mu.map((u) => u.phone ?? "").join("; "),
      mu.map((u) => u.city ?? "").join("; "),
      mu.map((u) => [u.occupation, u.organization].filter(Boolean).join(" — ")).join("; "),
      p.githubUrl,
      p.demoUrl,
      p.demoVideoUrl,
      extraLink(p.extraLinks, "Pitch Deck"),
      extraLink(p.extraLinks, "X"),
      extraLink(p.extraLinks, "LinkedIn"),
      p.contractAddress,
      p.network,
      p.problemStatement,
      p.solution,
      p.description,
    ];
  });

  if (new URL(req.url).searchParams.get("format") === "xlsx") {
    return xlsxResponse("iw3h-projects", await buildXlsx("Projects", headers, rows));
  }
  return csvResponse("iw3h-projects", toCsv(headers, rows));
}
