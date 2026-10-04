import { ALL_TRACKS, finalJudgingBoard, getCurrentHackathon, listTracks } from "@iw3h/db";
import { requireAuth } from "@/lib/auth";
import { csvResponse, csvText as text, toCsv } from "@/lib/csv";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** GET /api/admin/judging/export[?track=<id>] — ADMIN: rekap penjurian final sebagai CSV.
 *  Dengan ?track= peringkat dihitung di dalam track itu (hadiah per track). */
export async function GET(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return new Response("No hackathon", { status: 404 });

  const [{ criteria, rows }, tracks] = await Promise.all([
    finalJudgingBoard(db, hackathon.id),
    listTracks(db, hackathon.id),
  ]);
  const trackName = new Map(tracks.map((t) => [t.id, t.name]));
  const param = new URL(req.url).searchParams.get("track");
  const ctx = param && trackName.has(param) ? param : ALL_TRACKS;
  const ranked = rows
    .filter((r) => ctx === ALL_TRACKS || r.trackIds.includes(ctx))
    .sort(
      (a, b) =>
        (a.ranks[ctx]?.rank ?? Number.POSITIVE_INFINITY) -
          (b.ranks[ctx]?.rank ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name)
    );
  const notes = (r: (typeof rows)[number], key: "teamNote" | "internalNote") =>
    text(
      r.notes
        .filter((n) => n[key])
        .map((n) => `${n.judgeName ?? n.judgeAddress}: ${n[key]}`)
        .join(" | ")
    );

  const headers = [
    "Rank",
    "Tie",
    "Project",
    "Team",
    "Tracks",
    "Final score (1-5)",
    "Complete",
    "Judges in",
    "Judges eligible",
    ...criteria.map((c) =>
      text(`${c.name} (w${c.weight}${c.filledBy === "organizer" ? ", organizer" : ""})`)
    ),
    "Notes for team",
    "Internal notes",
  ];
  const data = ranked.map((r) => [
    r.ranks[ctx]?.rank ?? "",
    r.ranks[ctx]?.tie ? "TIE" : "",
    text(r.name),
    text(r.teamName ?? "Solo"),
    text(r.trackIds.map((id) => trackName.get(id) ?? id).join(" | ")),
    r.score === null ? "" : r.score.toFixed(3),
    r.complete ? "yes" : "no",
    r.judgesIn,
    r.judgesEligible,
    ...criteria.map((c) => (r.values[c.id] === undefined ? "" : r.values[c.id].toFixed(2))),
    notes(r, "teamNote"),
    notes(r, "internalNote"),
  ]);
  const name = ctx === ALL_TRACKS ? "final-judging" : `final-judging-${ctx}`;
  return csvResponse(name.replace(/[^a-zA-Z0-9_-]/g, "_"), toCsv(headers, data));
}
