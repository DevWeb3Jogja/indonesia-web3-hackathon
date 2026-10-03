import { curationBoard, getCurrentHackathon, listTracks } from "@iw3h/db";
import { requireAuth } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** Teks dari peserta (nama project/tim) bisa diawali =,+,-,@ → dieksekusi sebagai
 *  formula saat CSV dibuka di Excel/Sheets. Prefix ' supaya dibaca sebagai teks. */
const text = (v: string | null | undefined) => {
  const s = v ?? "";
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

/** GET /api/curation/export — ADMIN: ranking kurasi + shortlist sebagai CSV. */
export async function GET() {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return new Response("No hackathon", { status: 404 });

  const [{ criteria, rows }, tracks] = await Promise.all([
    curationBoard(db, hackathon.id, auth.address),
    listTracks(db, hackathon.id),
  ]);
  const trackName = new Map(tracks.map((t) => [t.id, t.name]));
  const ranked = [...rows].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name)
  );

  const headers = [
    "Rank",
    "Project",
    "Team",
    "Tracks",
    "Screening",
    "Fail reason",
    "Score (1-5)",
    "Reviewers",
    "Reviewer orgs",
    ...criteria.map((c) => text(`${c.name} (w${c.weight})`)),
    "Finalist slot",
    "Contact status",
    "Finalist note",
  ];
  const data = ranked.map((r, i) => [
    r.score === null ? "" : i + 1,
    text(r.name),
    text(r.teamName ?? "Solo"),
    text(r.trackIds.map((id) => trackName.get(id) ?? id).join(" | ")),
    r.screen?.decision ?? "pending",
    r.screen?.reason ?? "",
    r.score === null ? "" : r.score.toFixed(3),
    r.reviews.length,
    [...new Set(r.reviews.map((v) => v.organization))].join(" | "),
    ...criteria.map((c) =>
      r.criterionAvg[c.id] === undefined ? "" : r.criterionAvg[c.id].toFixed(2)
    ),
    r.finalist?.slot ?? "",
    r.finalist?.contactStatus ?? "",
    text(r.finalist?.note),
  ]);
  return csvResponse("curation", toCsv(headers, data));
}
