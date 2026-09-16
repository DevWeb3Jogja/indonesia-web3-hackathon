import { beforeEach, describe, expect, it } from "vitest";
import { createTeam, getCurrentHackathon, joinTeam } from "../src/teams";
import { ensureUser, setUserRole } from "../src/queries";
import {
  castVote,
  DEMO_HACKATHON_ID,
  ensureDemoEdition,
  getMyVote,
  listDemoDayProjects,
  markDemoDay,
  resetDemoVotes,
  setVotingSettings,
  VoteError,
  voteLeaderboard,
} from "../src/votes";
import { testDb } from "./helpers";

const H = "iw3h-2026";
const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;

/** Buat project (solo) langsung via SQL — cukup untuk uji vote. */
async function project(db: Awaited<ReturnType<typeof testDb>>, id: string, submitter: string) {
  await db.run(
    `INSERT INTO projects (id, hackathon_id, submitter_address, name) VALUES ('${id}','${H}','${submitter}','${id}')`
  );
}

async function seed(db: Awaited<ReturnType<typeof testDb>>) {
  await db.run(
    `INSERT INTO hackathons (id, slug, name, year, status) VALUES ('${H}','s','H',2026,'completed')`
  );
  for (let i = 1; i <= 6; i++) await ensureUser(db, addr(i));
}

describe("votes (integration)", () => {
  let db: Awaited<ReturnType<typeof testDb>>;
  beforeEach(async () => {
    db = await testDb();
    await seed(db);
  });

  it("tolak vote saat voting tertutup", async () => {
    await project(db, "pA", addr(1));
    await markDemoDay(db, "pA", true);
    await expect(castVote(db, H, addr(1), "participant", "pA")).rejects.toMatchObject({
      code: "voting_closed",
    });
  });

  it("tolak vote ke project non-finalis", async () => {
    await project(db, "pA", addr(1)); // tidak ditandai demo day
    await setVotingSettings(db, H, { votingOpen: true });
    await expect(castVote(db, H, addr(2), "judge", "pA")).rejects.toMatchObject({
      code: "not_finalist",
    });
  });

  it("participant di luar tim finalis tidak boleh vote; anggota finalis & juri boleh", async () => {
    await project(db, "pA", addr(1)); // addr1 = pemilik finalis
    await markDemoDay(db, "pA", true);
    await setVotingSettings(db, H, { votingOpen: true });

    // addr(5): participant biasa, bukan anggota finalis → ditolak
    await expect(castVote(db, H, addr(5), "participant", "pA")).rejects.toMatchObject({
      code: "not_eligible",
    });
    // addr(1): anggota (submitter) finalis → boleh
    expect(await castVote(db, H, addr(1), "participant", "pA")).toMatchObject({ ok: true });
    // addr(4): juri → boleh walau bukan anggota finalis
    await setUserRole(db, addr(4), "judge");
    expect(await castVote(db, H, addr(4), "judge", "pA")).toMatchObject({ ok: true });
  });

  it("anggota tim (bukan submitter) dari project finalis boleh vote", async () => {
    const t = await createTeam(db, H, addr(1), "Rocket");
    await joinTeam(db, H, addr(2), t.inviteCode);
    await db.run(
      `INSERT INTO projects (id, hackathon_id, team_id, submitter_address, name) VALUES ('pT','${H}','${t.id}','${addr(1)}','pT')`
    );
    await markDemoDay(db, "pT", true);
    await setVotingSettings(db, H, { votingOpen: true });
    // addr(2) = member biasa, bukan submitter → tetap boleh
    expect(await castVote(db, H, addr(2), "participant", "pT")).toMatchObject({ ok: true });
  });

  it("satu vote per wallet: vote ulang mengganti pilihan, bukan menambah baris", async () => {
    await project(db, "pA", addr(1));
    await project(db, "pB", addr(2));
    await markDemoDay(db, "pA", true);
    await markDemoDay(db, "pB", true);
    await setVotingSettings(db, H, { votingOpen: true });

    const r1 = await castVote(db, H, addr(3), "judge", "pA");
    expect(r1.changed).toBe(false);
    expect(await getMyVote(db, H, addr(3))).toBe("pA");

    const r2 = await castVote(db, H, addr(3), "judge", "pB"); // ganti pilihan
    expect(r2.changed).toBe(true);
    expect(await getMyVote(db, H, addr(3))).toBe("pB");

    const rows = await db.run(`SELECT COUNT(*) AS n FROM votes WHERE voter_address='${addr(3)}'`);
    expect(Number(rows.rows[0].n)).toBe(1);
  });

  it("leaderboard: semua finalis tampil, urut vote terbanyak (0 vote tetap ada)", async () => {
    await project(db, "pA", addr(1));
    await project(db, "pB", addr(2));
    await project(db, "pC", addr(3));
    for (const id of ["pA", "pB", "pC"]) await markDemoDay(db, id, true);
    await setVotingSettings(db, H, { votingOpen: true });

    // pB: 2 vote, pA: 1 vote, pC: 0
    await castVote(db, H, addr(4), "judge", "pB");
    await castVote(db, H, addr(5), "judge", "pB");
    await castVote(db, H, addr(6), "judge", "pA");

    const lb = await voteLeaderboard(db, H);
    expect(lb.map((r) => [r.id, r.votes])).toEqual([
      ["pB", 2],
      ["pA", 1],
      ["pC", 0],
    ]);
    expect(await listDemoDayProjects(db, H)).toHaveLength(3);
  });

  it("VoteError adalah instanceof Error (bisa dipetakan di route)", () => {
    expect(new VoteError("voting_closed", "x")).toBeInstanceOf(Error);
  });

  it("edisi demo: terisolasi dari edisi live, tapi vote-nya real", async () => {
    await ensureDemoEdition(db, addr(1)); // idempotent
    await ensureDemoEdition(db, addr(1));

    // getCurrentHackathon TAK pernah balikin edisi demo (situs live aman).
    expect((await getCurrentHackathon(db))?.id).toBe(H);

    // 4 finalis mock, voting sudah kebuka.
    const finalists = await listDemoDayProjects(db, DEMO_HACKATHON_ID);
    expect(finalists).toHaveLength(4);

    // Vote REAL di edisi demo (admin selalu eligible).
    const r = await castVote(db, DEMO_HACKATHON_ID, addr(4), "admin", finalists[0].id);
    expect(r.ok).toBe(true);
    expect(await getMyVote(db, DEMO_HACKATHON_ID, addr(4))).toBe(finalists[0].id);
    expect(
      (await voteLeaderboard(db, DEMO_HACKATHON_ID)).find((x) => x.id === finalists[0].id)?.votes
    ).toBe(1);

    // Vote demo TAK bocor ke edisi live.
    expect(await getMyVote(db, H, addr(4))).toBeNull();

    // Reset dry-run mengosongkan vote demo, finalis tetap.
    await resetDemoVotes(db);
    expect(await getMyVote(db, DEMO_HACKATHON_ID, addr(4))).toBeNull();
    expect(await listDemoDayProjects(db, DEMO_HACKATHON_ID)).toHaveLength(4);
  });
});
