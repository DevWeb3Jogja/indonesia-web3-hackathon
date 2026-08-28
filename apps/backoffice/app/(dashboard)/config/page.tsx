import { getCurrentHackathon, listCriteria, listPrizes, listTracks } from "@iw3h/db";
import ConfigEditor from "@/components/ConfigEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Konfigurasi</h1>
        <p className="text-sm text-muted-foreground">Belum ada hackathon.</p>
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
        <h1 className="text-xl font-semibold">Konfigurasi</h1>
        <p className="text-sm text-muted-foreground">Tracks, kriteria penilaian, dan prizes.</p>
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
    </div>
  );
}
