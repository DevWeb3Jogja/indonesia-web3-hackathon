import {
  adminStats,
  getCurrentHackathon,
  getUser,
  listCriteria,
  listJudgeAssignments,
  listPrizes,
  listTracks,
  listUsers,
  listWinners,
  projectRankings,
} from "@iw3h/db";
import AuditPanel from "@/components/AuditPanel";
import { AppSidebar } from "@/components/app-sidebar";
import ConfigEditor from "@/components/ConfigEditor";
import HackathonSettings from "@/components/HackathonSettings";
import JudgeTracks from "@/components/JudgeTracks";
import PhaseControl from "@/components/PhaseControl";
import ProjectsPanel from "@/components/ProjectsPanel";
import SignInGate from "@/components/SignInGate";
import { SiteHeader } from "@/components/site-header";
import UsersPanel from "@/components/UsersPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WinnerPicker from "@/components/WinnerPicker";
import { auth } from "@/lib/auth";
import { db } from "@/lib/turso";
import { short } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth.getSession();
  if (!session.address) return <SignInGate reason="signin" />;

  const user = await getUser(db, session.address);
  if (user?.role !== "admin") return <SignInGate reason="forbidden" />;

  const hackathon = await getCurrentHackathon(db);
  const [stats, users, rankings, prizes, winners, tracks, criteria, judgeAssign] =
    await Promise.all([
      adminStats(db),
      listUsers(db, 100),
      hackathon ? projectRankings(db, hackathon.id) : Promise.resolve([]),
      hackathon ? listPrizes(db, hackathon.id) : Promise.resolve([]),
      listWinners(db),
      hackathon ? listTracks(db, hackathon.id) : Promise.resolve([]),
      hackathon ? listCriteria(db, hackathon.id) : Promise.resolve([]),
      hackathon ? listJudgeAssignments(db, hackathon.id) : Promise.resolve([]),
    ]);
  const judges = users.filter((u) => u.role === "judge" || u.role === "admin");
  const tracksOf = (addr: string) =>
    judgeAssign.filter((a) => a.judgeAddress === addr).map((a) => a.trackId);
  const winnerOf = (prizeId: string) =>
    winners.find((w) => w.prizeId === prizeId)?.projectId ?? null;
  const rankOptions = rankings.map((r) => ({
    projectId: r.projectId,
    name: r.name,
    avgScore: r.avgScore,
  }));
  const trackOptions = tracks.map((t) => ({ value: t.id, label: t.name }));
  const statCards = [
    { label: "Users", value: stats.users },
    { label: "Registrasi", value: stats.registrations },
    { label: "Projects", value: stats.projects },
    { label: "Skor juri", value: stats.scores },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader address={user.address} />
        <main className="flex-1 space-y-8 p-4 md:p-6">
          {/* Overview */}
          <section id="overview" className="scroll-mt-16 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((s) => (
                <Card key={s.label}>
                  <CardHeader className="pb-2">
                    <CardDescription>{s.label}</CardDescription>
                    <CardTitle className="text-3xl tabular-nums">{s.value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {hackathon && (
              <Card>
                <CardHeader>
                  <CardTitle>Fase hackathon</CardTitle>
                  <CardDescription>
                    {hackathon.name} · fase sekarang:{" "}
                    <Badge variant="secondary">{hackathon.status}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PhaseControl current={hackathon.status} />
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Setting edisi</h3>
                    <HackathonSettings current={hackathon as unknown as Record<string, unknown>} />
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Projects */}
          <section id="projects" className="scroll-mt-16">
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Semua status. Cari, filter, sort, paginasi.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectsPanel />
              </CardContent>
            </Card>
          </section>

          {/* Config */}
          {hackathon && (
            <section id="config" className="scroll-mt-16 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tracks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConfigEditor
                    endpoint="/api/admin/tracks"
                    items={tracks}
                    fields={[
                      { key: "code", label: "Kode" },
                      { key: "name", label: "Nama" },
                      { key: "description", label: "Deskripsi" },
                      { key: "sort", label: "Urutan", type: "number" },
                    ]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Kriteria penilaian</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConfigEditor
                    endpoint="/api/admin/criteria"
                    items={criteria}
                    fields={[
                      { key: "name", label: "Nama" },
                      { key: "weight", label: "Bobot", type: "number" },
                      { key: "description", label: "Deskripsi" },
                      { key: "sort", label: "Urutan", type: "number" },
                    ]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Prizes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConfigEditor
                    endpoint="/api/admin/prizes"
                    items={prizes}
                    fields={[
                      { key: "name", label: "Nama" },
                      { key: "amountUsd", label: "Nilai (USD)", type: "number" },
                      { key: "sponsor", label: "Sponsor" },
                      { key: "trackId", label: "Track", type: "select", options: trackOptions },
                      { key: "sort", label: "Urutan", type: "number" },
                    ]}
                  />
                </CardContent>
              </Card>
            </section>
          )}

          {/* Judging */}
          <section id="judging" className="scroll-mt-16 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Assign juri → track</CardTitle>
                <CardDescription>Kosong = juri menilai semua track.</CardDescription>
              </CardHeader>
              <CardContent>
                {judges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada juri. Set role di tabel Users.
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
                <CardTitle>Ranking penjurian</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                      <TableHead className="text-right">Juri</TableHead>
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

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Pemenang</CardTitle>
              </CardHeader>
              <CardContent>
                {prizes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada prize dikonfigurasi.</p>
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
                          options={rankOptions}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Users */}
          <section id="users" className="scroll-mt-16">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <UsersPanel />
              </CardContent>
            </Card>
          </section>

          {/* Audit */}
          <section id="audit" className="scroll-mt-16">
            <Card>
              <CardHeader>
                <CardTitle>Audit log</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditPanel />
              </CardContent>
            </Card>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
