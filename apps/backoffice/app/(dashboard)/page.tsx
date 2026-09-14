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
  const funnelCards = funnel
    ? [
        {
          label: "Wallet only",
          value: funnel.counts.wallet,
          desc: "Signed in, profile incomplete",
        },
        { label: "Profile complete", value: funnel.counts.profile, desc: "No team / project yet" },
        { label: "In a team", value: funnel.counts.team, desc: "Joined a team, not submitted" },
        { label: "Submitted", value: funnel.counts.submitted, desc: "Has a project" },
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
              Each of the {funnel.total} users at their furthest stage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {funnelCards.map((c) => (
                <div key={c.label} className="rounded-lg border p-4">
                  <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
                  <p className="mt-1 text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Note: “filled but not submitted” drafts live only in the participant's browser and
              can't be shown here. Use the CSV exports on the Projects and Users pages for full
              data.
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
