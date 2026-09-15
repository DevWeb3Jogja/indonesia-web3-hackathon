import { adminStats, getCurrentHackathon, userFunnel, voteLeaderboard } from "@iw3h/db";
import HackathonSettings from "@/components/HackathonSettings";
import PhaseControl from "@/components/PhaseControl";
import VotingControl from "@/components/VotingControl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const VOTE_URL = process.env.NEXT_PUBLIC_VOTE_URL ?? "https://vote.indonesiaweb3hack.xyz";

export default async function OverviewPage() {
  const [stats, hackathon] = await Promise.all([adminStats(db), getCurrentHackathon(db)]);
  const [funnel, leaderboard] = hackathon
    ? await Promise.all([userFunnel(db, hackathon.id), voteLeaderboard(db, hackathon.id)])
    : [null, []];
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
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Summary & hackathon phase controls.
        </p>
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
            <CardTitle className="text-base">Participants by stage</CardTitle>
            <CardDescription>
              <span className="font-semibold text-gray-800 dark:text-white/90 tabular-nums">
                {funnel.total}
              </span>{" "}
              sign-ins ·{" "}
              <span className="font-semibold text-gray-800 dark:text-white/90 tabular-nums">
                {funnel.total - funnel.counts.connected}
              </span>{" "}
              engaged ·{" "}
              <span className="font-semibold text-gray-800 dark:text-white/90 tabular-nums">
                {funnel.counts.submitted}
              </span>{" "}
              submitted (
              {funnel.total ? Math.round((funnel.counts.submitted / funnel.total) * 100) : 0}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {funnelStages.map((s) => {
                const pct = funnel.total ? Math.round((s.value / funnel.total) * 100) : 0;
                return (
                  <div
                    key={s.label}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`size-2.5 shrink-0 rounded-full ${s.color}`} />
                      <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                        {s.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-bold tabular-nums text-gray-800 dark:text-white/90">
                        {s.value}
                      </span>
                      <span className="text-theme-xs font-medium text-gray-400">{pct}%</span>
                    </div>
                    <p className="mt-1 text-theme-xs leading-snug text-gray-500 dark:text-gray-400">
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 border-t border-gray-200 pt-3 text-theme-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Stages are mutually exclusive (each user counted once at their furthest step). “Filled
              but not submitted” drafts live only in the participant's browser — use the CSV exports
              on the Projects &amp; Users pages for full data.
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
        <p className="text-sm text-gray-500 dark:text-gray-400">No hackathon yet.</p>
      )}

      {hackathon ? (
        <Card>
          <CardHeader>
            <CardTitle>Demo Day voting</CardTitle>
            <CardDescription>
              Tandai finalis di halaman Projects (ikon bintang), lalu buka voting saat demo day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VotingControl
              votingOpen={hackathon.votingOpen}
              leaderboardPublic={hackathon.leaderboardPublic}
              leaderboard={leaderboard}
              voteUrl={VOTE_URL}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
