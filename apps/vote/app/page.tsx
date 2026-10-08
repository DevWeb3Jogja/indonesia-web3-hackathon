import {
  countVotes,
  DEMO_HACKATHON_ID,
  ensureDemoEdition,
  getCurrentHackathon,
  getMyVote,
  getUser,
  listDemoDayProjects,
  ownFinalistIds,
} from "@iw3h/db";
import VoteApp from "@/components/VoteApp";
import { auth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/**
 * Gate akses (server, tak bisa dilewati UI):
 *  - Situs: admin selalu; selain itu hanya saat voting dibuka (demo day).
 *  - Angka per project TIDAK pernah tampil di app vote (termasuk admin — laptop admin
 *    dipakai di videotron). Hasil hanya di backoffice; diumumkan di panggung.
 *  - Demo (dry-run): HANYA admin (?demo=1) → edisi demo terpisah, vote real.
 * Aksi (vote) diproteksi lagi di /api/vote (session + finalis + sekali + bukan
 * project sendiri + demo-gate).
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.getSession();
  const address = session.address ?? null;
  const user = address ? await getUser(db, address) : null;
  const isAdmin = user?.role === "admin";

  // Demo mode: param HANYA dihormati untuk admin. Vote di edisi demo.
  const demo = isAdmin && address ? (await searchParams).demo === "1" : false;
  if (demo && address) {
    await ensureDemoEdition(db, address);
    const [finalists, myVote, ownIds] = await Promise.all([
      listDemoDayProjects(db, DEMO_HACKATHON_ID),
      getMyVote(db, DEMO_HACKATHON_ID, address),
      ownFinalistIds(db, DEMO_HACKATHON_ID, address),
    ]);
    return (
      <VoteApp
        demo
        signedIn
        isAdmin
        votingOpen
        canAccess
        finalists={finalists}
        myVote={myVote}
        ownIds={ownIds}
      />
    );
  }

  const hackathon = await getCurrentHackathon(db);
  const votingOpen = hackathon?.votingOpen ?? false;
  const canAccess = isAdmin || votingOpen;
  const show = canAccess && hackathon;
  // Gate untuk yang belum boleh masuk: "belum dibuka" vs "sudah ditutup" (hanya total,
  // bukan angka per project — sama dengan yang tampil di layar besar).
  const votingClosed = !canAccess && hackathon ? (await countVotes(db, hackathon.id)) > 0 : false;

  const [finalists, myVote, ownIds] = await Promise.all([
    show ? listDemoDayProjects(db, hackathon.id) : [],
    show && address ? getMyVote(db, hackathon.id, address) : null,
    show && address ? ownFinalistIds(db, hackathon.id, address) : [],
  ]);

  return (
    <VoteApp
      demo={false}
      signedIn={!!address}
      isAdmin={isAdmin}
      votingOpen={votingOpen}
      canAccess={canAccess}
      votingClosed={votingClosed}
      finalists={finalists}
      myVote={myVote}
      ownIds={ownIds}
    />
  );
}
