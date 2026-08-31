import { adminStats, getCurrentHackathon } from "@iw3h/db";
import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { ClipboardList, FolderGit2, Gavel, Users } from "lucide-react";
import HackathonSettings from "@/components/HackathonSettings";
import PhaseControl from "@/components/PhaseControl";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [stats, hackathon] = await Promise.all([adminStats(db), getCurrentHackathon(db)]);
  const cards = [
    { label: "Users", value: stats.users, icon: Users, tone: "bg-primary/10 text-primary" },
    {
      label: "Registrations",
      value: stats.registrations,
      icon: ClipboardList,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      label: "Projects",
      value: stats.projects,
      icon: FolderGit2,
      tone: "bg-success/10 text-success",
    },
    { label: "Judge scores", value: stats.scores, icon: Gavel, tone: "bg-warning/10 text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-default-500">Summary &amp; hackathon phase controls.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} shadow="sm" className="border border-default-100">
              <CardBody className="flex flex-row items-center gap-4 p-5">
                <div className={`flex size-11 items-center justify-center rounded-xl ${c.tone}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-default-400">{c.label}</p>
                  <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {hackathon ? (
        <Card shadow="sm" className="border border-default-100">
          <CardHeader className="flex-col items-start gap-1 px-6 pt-5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Hackathon phase</h2>
              <Chip size="sm" color="secondary" variant="flat" className="capitalize">
                {hackathon.status}
              </Chip>
            </div>
            <p className="text-sm text-default-500">{hackathon.name}</p>
          </CardHeader>
          <CardBody className="space-y-6 px-6 pb-6">
            <PhaseControl current={hackathon.status} />
            <div>
              <h3 className="mb-3 text-sm font-semibold">Edition settings</h3>
              <HackathonSettings current={hackathon as unknown as Record<string, unknown>} />
            </div>
          </CardBody>
        </Card>
      ) : (
        <p className="text-sm text-default-500">No hackathon yet.</p>
      )}
    </div>
  );
}
