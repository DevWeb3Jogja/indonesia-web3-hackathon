import { getCurrentHackathon, listTracks } from "@iw3h/db";
import ProjectsPanel from "@/components/ProjectsPanel";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const hackathon = await getCurrentHackathon(db);
  const tracks = hackathon ? await listTracks(db, hackathon.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Projects</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All statuses. Search, filter by status / track / finalist, sort, paginated.
        </p>
      </div>
      <Card>
        <CardContent>
          <ProjectsPanel tracks={tracks.map((t) => ({ id: t.id, name: t.name }))} />
        </CardContent>
      </Card>
    </div>
  );
}
