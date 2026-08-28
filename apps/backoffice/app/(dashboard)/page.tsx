import { adminStats, getCurrentHackathon } from "@iw3h/db";
import HackathonSettings from "@/components/HackathonSettings";
import PhaseControl from "@/components/PhaseControl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [stats, hackathon] = await Promise.all([adminStats(db), getCurrentHackathon(db)]);
  const cards = [
    { label: "Users", value: stats.users },
    { label: "Registrasi", value: stats.registrations },
    { label: "Projects", value: stats.projects },
    { label: "Skor juri", value: stats.scores },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Ringkasan & kontrol fase hackathon.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{c.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {hackathon ? (
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
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada hackathon.</p>
      )}
    </div>
  );
}
