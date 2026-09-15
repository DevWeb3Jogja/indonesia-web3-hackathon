import {
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
 * Aksi (vote) diproteksi lagi di /api/vote (session + finalis + eligible).
 */
export default async function Page() {
  const session = await auth.getSession();
  const address = session.address ?? null;
  const user = address ? await getUser(db, address) : null;
  const isAdmin = user?.role === "admin";

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
