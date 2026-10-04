import {
  ALL_TRACKS,
  finalJudgingBoard,
  getCurrentHackathon,
  isFrozen,
  listJudgeAssignments,
  listPrizes,
  listTracks,
  listUsers,
  listWinners,
  projectRankings,
} from "@iw3h/db";
import JudgeTracks from "@/components/JudgeTracks";
import JudgingBoard from "@/components/JudgingBoard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import WinnerPicker, { type WinnerOption } from "@/components/WinnerPicker";
import { pageUser } from "@/lib/page-auth";
import { db } from "@/lib/turso";
import { short } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JudgingPage() {
  // Guard di PAGE (layout tak mencegah payload RSC page terkirim) — lihat lib/page-auth.ts.
  // Halaman ini memuat nilai, peringkat & catatan internal juri: RAHASIA.
  const user = await pageUser("admin");
  if (!user) return null;
  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Judging</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">No hackathon yet.</p>
      </div>
    );
  }
  const [users, board, submitted, prizes, winners, tracks, judgeAssign] = await Promise.all([
    listUsers(db, 100),
    finalJudgingBoard(db, hackathon.id),
    projectRankings(db, hackathon.id),
    listPrizes(db, hackathon.id),
    listWinners(db),
    listTracks(db, hackathon.id),
    listJudgeAssignments(db, hackathon.id),
  ]);
  const judges = users.filter((u) => u.role === "judge" || u.role === "admin");
  const tracksOf = (addr: string) =>
    judgeAssign.filter((a) => a.judgeAddress === addr).map((a) => a.trackId);
  const winnerOf = (id: string) => winners.find((w) => w.prizeId === id)?.projectId ?? null;

  // Pemenang: finalis dulu (urut peringkat final + nilainya), lalu project submitted lain
  // (route winners tetap menerima semua project submitted — perilaku lama dipertahankan).
  const finalistIds = new Set(board.rows.map((r) => r.id));
  const winnerOptions: WinnerOption[] = [
    ...[...board.rows]
      .sort(
        (a, b) =>
          (a.ranks[ALL_TRACKS]?.rank ?? Number.POSITIVE_INFINITY) -
            (b.ranks[ALL_TRACKS]?.rank ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name)
      )
      .map((r) => ({ projectId: r.id, name: r.name, score: r.score, finalist: true })),
    ...submitted
      .filter((p) => !finalistIds.has(p.projectId))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ projectId: p.projectId, name: p.name, score: null, finalist: false })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Judging</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Demo day final judging: live recap, scoreboard, judge assignment, and winners.
        </p>
      </div>

      <JudgingBoard
        initial={board}
        tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
        frozen={isFrozen(hackathon)}
        phase={hackathon.status}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assign judges → track</CardTitle>
            <CardDescription>
              Empty = a judge scores all tracks. Only wallets with the Judge role can submit scores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {judges.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No judges yet. Set a user's role to Judge on the Users page.
              </p>
            ) : (
              <div className="space-y-3">
                {judges.map((j) => (
                  <div
                    key={j.address}
                    className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0"
                  >
                    <span className="text-sm">
                      {j.username ?? <code className="text-xs">{short(j.address)}</code>}{" "}
                      <Badge variant="outline" className="ml-1">
                        {j.role}
                      </Badge>
                    </span>
                    <JudgeTracks
                      judgeAddress={j.address}
                      tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
                      assigned={tracksOf(j.address)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Winners</CardTitle>
            <CardDescription>
              Finalists are listed first with their final score (1–5).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prizes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No prizes configured yet.</p>
            ) : (
              <div className="space-y-3">
                {prizes.map((pz) => (
                  <div
                    key={pz.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0"
                  >
                    <span className="text-sm font-medium">
                      {pz.name}
                      {pz.amountUsd ? ` · $${pz.amountUsd.toLocaleString()}` : ""}
                    </span>
                    <WinnerPicker
                      prizeId={pz.id}
                      current={winnerOf(pz.id)}
                      options={winnerOptions}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
