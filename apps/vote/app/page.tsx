import {
  DEMO_HACKATHON_ID,
  ensureDemoEdition,
  getCurrentHackathon,
  getMyVote,
  getUser,
  listDemoDayProjects,
  voteLeaderboard,
} from "@iw3h/db";
import VoteApp from "@/components/VoteApp";
import { auth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/**
 * Gate akses (server, tak bisa dilewati UI):
 *  - Situs: admin selalu; participant/judge hanya saat demo day (votingOpen).
 *  - Leaderboard: admin selalu; selain itu hanya kalau leaderboardPublic.
 *  - Demo (dry-run): HANYA admin (?demo=1) → edisi demo terpisah, vote real.
 * Aksi (vote) diproteksi lagi di /api/vote (session + finalis + eligible + demo-gate).
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

  // Demo mode: param HANYA dihormati untuk admin. Vote/leaderboard di edisi demo.
  const demo = isAdmin && address ? (await searchParams).demo === "1" : false;
  if (demo && address) {
    await ensureDemoEdition(db, address);
    const [finalists, myVote, leaderboard] = await Promise.all([
      listDemoDayProjects(db, DEMO_HACKATHON_ID),
      getMyVote(db, DEMO_HACKATHON_ID, address),
      voteLeaderboard(db, DEMO_HACKATHON_ID),
    ]);
    return (
      <VoteApp
        demo
        signedIn
        isAdmin
        votingOpen
        canAccess
        canSeeLeaderboard
        finalists={finalists}
        myVote={myVote}
        leaderboard={leaderboard}
      />
    );
  }

  const hackathon = await getCurrentHackathon(db);
  const votingOpen = hackathon?.votingOpen ?? false;
  const leaderboardPublic = hackathon?.leaderboardPublic ?? false;

  const canAccess = isAdmin || votingOpen;
  const canSeeLeaderboard = isAdmin || leaderboardPublic;

  const finalists = canAccess && hackathon ? await listDemoDayProjects(db, hackathon.id) : [];
  const myVote =
    canAccess && address && hackathon ? await getMyVote(db, hackathon.id, address) : null;
  const leaderboard =
    canSeeLeaderboard && hackathon ? await voteLeaderboard(db, hackathon.id) : null;

  return (
    <VoteApp
      demo={false}
      signedIn={!!address}
      isAdmin={isAdmin}
      votingOpen={votingOpen}
      canAccess={canAccess}
      canSeeLeaderboard={canSeeLeaderboard}
      finalists={finalists}
      myVote={myVote}
      leaderboard={leaderboard}
    />
  );
}
