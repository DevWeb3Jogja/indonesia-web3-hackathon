import { getCurrentHackathon, listCriteria, listPrizes, listTracks } from "@iw3h/db";
import ConfigEditor from "@/components/ConfigEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pageUser } from "@/lib/page-auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  // Guard di PAGE (layout tak mencegah payload RSC page terkirim) — lihat lib/page-auth.ts.
  const user = await pageUser("admin");
  if (!user) return null;
  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">No hackathon yet.</p>
      </div>
    );
  }
  const [tracks, criteria, prizes] = await Promise.all([
    listTracks(db, hackathon.id),
    listCriteria(db, hackathon.id),
    listPrizes(db, hackathon.id),
  ]);
  const trackOptions = tracks.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tracks, scoring criteria, and prizes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracks</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfigEditor
            endpoint="/api/admin/tracks"
            items={tracks}
            fields={[
              { key: "code", label: "Code" },
              { key: "name", label: "Name" },
              { key: "description", label: "Description" },
              { key: "sort", label: "Order", type: "number" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring criteria</CardTitle>
          <CardDescription>
            Shared by curation and final judging. “Organizers” criteria (e.g. Participation) are
            hidden from the judge form and filled in on the Judging page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigEditor
            endpoint="/api/admin/criteria"
            items={criteria}
            fields={[
              { key: "name", label: "Name" },
              { key: "weight", label: "Weight", type: "number" },
              { key: "description", label: "Description" },
              {
                key: "filledBy",
                label: "Filled by",
                type: "select",
                required: true,
                placeholder: "Judges (default)",
                options: [
                  { value: "judge", label: "Judges" },
                  { value: "organizer", label: "Organizers" },
                ],
              },
              { key: "sort", label: "Order", type: "number" },
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
              { key: "name", label: "Name" },
              { key: "amountUsd", label: "Amount (USD)", type: "number" },
              { key: "sponsor", label: "Sponsor" },
              { key: "trackId", label: "Track", type: "select", options: trackOptions },
              { key: "sort", label: "Order", type: "number" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
