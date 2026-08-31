import {
  getCurrentHackathon,
  listJudgeAssignments,
  listPrizes,
  listTracks,
  listUsers,
  listWinners,
  projectRankings,
} from "@iw3h/db";
import JudgeTracks from "@/components/JudgeTracks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WinnerPicker from "@/components/WinnerPicker";
import { db } from "@/lib/turso";
import { short } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JudgingPage() {
  const hackathon = await getCurrentHackathon(db);
  const [users, rankings, prizes, winners, tracks, judgeAssign] = await Promise.all([
    listUsers(db, 100),
    hackathon ? projectRankings(db, hackathon.id) : Promise.resolve([]),
    hackathon ? listPrizes(db, hackathon.id) : Promise.resolve([]),
    listWinners(db),
    hackathon ? listTracks(db, hackathon.id) : Promise.resolve([]),
    hackathon ? listJudgeAssignments(db, hackathon.id) : Promise.resolve([]),
  ]);
  const judges = users.filter((u) => u.role === "judge" || u.role === "admin");
  const tracksOf = (addr: string) =>
    judgeAssign.filter((a) => a.judgeAddress === addr).map((a) => a.trackId);
  const winnerOf = (id: string) => winners.find((w) => w.prizeId === id)?.projectId ?? null;
  const rankOptions = rankings.map((r) => ({
    projectId: r.projectId,
    name: r.name,
    avgScore: r.avgScore,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Judging</h1>
        <p className="text-sm text-muted-foreground">Assign judges, ranking, and winners.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assign judges → track</CardTitle>
            <CardDescription>Empty = a judge scores all tracks.</CardDescription>
          </CardHeader>
          <CardContent>
            {judges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada juri. Set role di halaman Users.
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
            <CardTitle>Judging ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Judge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Belum ada skor.
                    </TableCell>
                  </TableRow>
                )}
                {rankings.map((r, i) => (
                  <TableRow key={r.projectId}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.judges > 0 ? r.avgScore.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.judges}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Winners</CardTitle>
        </CardHeader>
        <CardContent>
          {prizes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prizes configured yet.</p>
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
                  <WinnerPicker prizeId={pz.id} current={winnerOf(pz.id)} options={rankOptions} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
