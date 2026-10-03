import {
  canCurate,
  curationBoard,
  getCurrentHackathon,
  getReviewerOrg,
  listTracks,
} from "@iw3h/db";
import CurationBoard from "@/components/CurationBoard";
import { pageUser } from "@/lib/page-auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export default async function CurationPage() {
  // Guard di PAGE (bukan cuma layout) — lihat lib/page-auth.ts. Layout yang menampilkan
  // pesan sign-in/forbidden; di sini cukup jangan memuat data apa pun.
  const user = await pageUser("admin", "panitia");
  if (!user) return null;
  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No hackathon yet.</p>;
  }

  const [board, org, tracks] = await Promise.all([
    // Shortlist & status kontak admin-only: untuk panitia data itu tak dimuat sama sekali.
    curationBoard(db, hackathon.id, user.address, { includeFinalists: user.role === "admin" }),
    getReviewerOrg(db, hackathon.id, user.address),
    listTracks(db, hackathon.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Curation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Screen → score → shortlist 10 finalists + 5 reserves. Internal only — never shared with
          participants.
        </p>
      </div>
      <CurationBoard
        isAdmin={user.role === "admin"}
        organization={org}
        open={canCurate(hackathon)}
        criteria={board.criteria}
        rows={board.rows}
        tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}
