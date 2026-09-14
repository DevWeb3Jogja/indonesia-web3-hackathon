import { adminStats, getCurrentHackathon, userFunnel } from "@iw3h/db";
import HackathonSettings from "@/components/HackathonSettings";
import PhaseControl from "@/components/PhaseControl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [stats, hackathon] = await Promise.all([adminStats(db), getCurrentHackathon(db)]);
  const funnel = hackathon ? await userFunnel(db, hackathon.id) : null;
  const cards = [
    { label: "Users", value: stats.users },
    { label: "Registrations", value: stats.registrations },
    { label: "Projects", value: stats.projects },
    { label: "Judge scores", value: stats.scores },
  ];
  const funnelStages = funnel
    ? [
        {
          label: "Just connected",
          value: funnel.counts.connected,
          desc: "Signed in, nothing filled yet",
          color: "bg-zinc-400",
        },
        {
          label: "Profile started",
          value: funnel.counts.profileStarted,
          desc: "Began profile, not complete",
          color: "bg-amber-400",
        },
        {
          label: "Profile complete",
          value: funnel.counts.profileComplete,
          desc: "All required fields, no team/project",
          color: "bg-sky-500",
        },
        {
          label: "In a team",
          value: funnel.counts.team,
          desc: "Joined a team, not submitted",
          color: "bg-violet-500",
        },
        {
          label: "Submitted",
          value: funnel.counts.submitted,
          desc: "Has a project",
          color: "bg-emerald-500",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Summary & hackathon phase controls.</p>
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

      {funnel && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Participant funnel</CardTitle>
            <CardDescription>
              {funnel.total} sign-ins, each counted once at their furthest stage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5">
              {funnelStages.map((s) => {
                const pct = funnel.total ? Math.round((s.value / funnel.total) * 100) : 0;
                return (
                  <div key={s.label}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <span className={`size-2.5 shrink-0 rounded-full ${s.color}`} />
                        {s.label}
                      </span>
                      <span className="tabular-nums">
                        <span className="font-semibold">{s.value}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{pct}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${s.color}`}
                        style={{ width: `${Math.max(pct, s.value > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              “Filled but not submitted” drafts live only in the participant's browser and can't be
              shown here. Use the CSV exports on the Projects and Users pages for full data.
            </p>
          </CardContent>
        </Card>
      )}

      {hackathon ? (
        <Card>
          <CardHeader>
            <CardTitle>Hackathon phase</CardTitle>
            <CardDescription>
              {hackathon.name} · current phase:{" "}
              <Badge variant="secondary">{hackathon.status}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PhaseControl current={hackathon.status} />
            <div>
              <h3 className="mb-3 text-sm font-semibold">Edition settings</h3>
              <HackathonSettings current={hackathon as unknown as Record<string, unknown>} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">No hackathon yet.</p>
      )}
    </div>
  );
}
