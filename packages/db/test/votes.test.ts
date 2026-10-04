import { beforeEach, describe, expect, it } from "vitest";
import { ensureUser } from "../src/queries";
import { createTeam, getCurrentHackathon, joinTeam } from "../src/teams";
import {
  castVote,
  countVotes,
  DEMO_HACKATHON_ID,
  ensureDemoEdition,
  getMyVote,
  listDemoDayProjects,
  markDemoDay,
  ownFinalistIds,
  resetDemoVotes,
  screenState,
  setVotingSettings,
  VoteError,
  voteLeaderboard,
  voteScreen,
} from "../src/votes";
import { testDb } from "./helpers";

const H = "iw3h-2026";
const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;

/** Buat project (solo) langsung via SQL — cukup untuk uji vote. */
async function project(
  db: Awaited<ReturnType<typeof testDb>>,
  id: string,
  submitter: string,
  name = id
) {
  await db.run(
    `INSERT INTO projects (id, hackathon_id, submitter_address, name) VALUES ('${id}','${H}','${submitter}','${name}')`
  );
}

async function seed(db: Awaited<ReturnType<typeof testDb>>) {
  await db.run(
    `INSERT INTO hackathons (id, slug, name, year, status) VALUES ('${H}','s','H',2026,'completed')`
  );
  for (let i = 1; i <= 8; i++) await ensureUser(db, addr(i));
}

/** Tiga finalis pA/pB/pC (pemilik addr1/2/3), voting dibuka. */
async function openWithFinalists(db: Awaited<ReturnType<typeof testDb>>) {
  await project(db, "pA", addr(1));
  await project(db, "pB", addr(2));
  await project(db, "pC", addr(3));
  for (const id of ["pA", "pB", "pC"]) await markDemoDay(db, id, true);
  await setVotingSettings(db, H, { votingOpen: true });
}

const countRows = async (db: Awaited<ReturnType<typeof testDb>>, voter: string) =>
  Number(
    (await db.run(`SELECT COUNT(*) AS n FROM votes WHERE voter_address='${voter}'`)).rows[0].n
  );

describe("votes (integration)", () => {
  let db: Awaited<ReturnType<typeof testDb>>;
  beforeEach(async () => {
    db = await testDb();
    await seed(db);
  });

  it("tolak vote saat voting tertutup", async () => {
    await project(db, "pA", addr(1));
    await markDemoDay(db, "pA", true);
    await expect(castVote(db, H, addr(5), "pA")).rejects.toMatchObject({
      code: "voting_closed",
    });
    expect(await countVotes(db, H)).toBe(0);
  });

  it("tolak vote ke project non-finalis / project edisi lain / id ngawur", async () => {
    await project(db, "pA", addr(1)); // tidak ditandai demo day
    await setVotingSettings(db, H, { votingOpen: true });
    await expect(castVote(db, H, addr(2), "pA")).rejects.toMatchObject({ code: "not_finalist" });
    await expect(castVote(db, H, addr(2), "tidak-ada")).rejects.toMatchObject({
      code: "not_finalist",
    });
    // Finalis edisi demo tak bisa dipilih lewat edisi live.
    await ensureDemoEdition(db, addr(1));
    await expect(castVote(db, H, addr(2), "demo-proj-1")).rejects.toMatchObject({
      code: "not_finalist",
    });
  });

  it("siapa pun yang sign-in boleh vote — participant biasa di luar tim finalis juga", async () => {
    await openWithFinalists(db);
    // addr(5): participant biasa, tak punya project → dulu ditolak, sekarang boleh.
    expect(await castVote(db, H, addr(5), "pA")).toEqual({ ok: true });
    expect(await getMyVote(db, H, addr(5))).toBe("pA");
    // Pemilik finalis LAIN boleh memilih finalis selain miliknya.
    expect(await castVote(db, H, addr(1), "pB")).toEqual({ ok: true });
  });

  it("tak boleh memilih project sendiri: submitter", async () => {
    await openWithFinalists(db);
    await expect(castVote(db, H, addr(1), "pA")).rejects.toMatchObject({ code: "own_project" });
    expect(await getMyVote(db, H, addr(1))).toBeNull();
    // Masih bisa memilih project lain setelah ditolak.
    expect(await castVote(db, H, addr(1), "pC")).toEqual({ ok: true });
  });

  it("tak boleh memilih project sendiri: anggota & ketua tim (bukan submitter)", async () => {
    const t = await createTeam(db, H, addr(4), "Rocket"); // addr4 = ketua
    await joinTeam(db, H, addr(6), t.inviteCode); // addr6 = anggota
    // submitter = addr7 (bukan ketua) supaya cek ketua & anggota benar-benar teruji.
    await db.run(
      `INSERT INTO projects (id, hackathon_id, team_id, submitter_address, name) VALUES ('pT','${H}','${t.id}','${addr(7)}','pT')`
    );
    await markDemoDay(db, "pT", true);
    await setVotingSettings(db, H, { votingOpen: true });

    for (const a of [addr(4), addr(6), addr(7)]) {
      await expect(castVote(db, H, a, "pT")).rejects.toMatchObject({ code: "own_project" });
    }
    expect(await ownFinalistIds(db, H, addr(6))).toEqual(["pT"]);
    // Orang luar tim boleh.
    expect(await castVote(db, H, addr(8), "pT")).toEqual({ ok: true });
  });

  it("cek kepemilikan tak peka huruf besar/kecil alamat", async () => {
    await openWithFinalists(db);
    const upper = `0x${addr(1).slice(2).toUpperCase()}`;
    expect(await ownFinalistIds(db, H, upper)).toEqual(["pA"]);
  });

  it("vote SEKALI: vote kedua (project sama / beda) ditolak, pilihan pertama tetap", async () => {
    await openWithFinalists(db);
    expect(await castVote(db, H, addr(5), "pA")).toEqual({ ok: true });

    await expect(castVote(db, H, addr(5), "pB")).rejects.toMatchObject({
      code: "already_voted",
    });
    await expect(castVote(db, H, addr(5), "pA")).rejects.toMatchObject({
      code: "already_voted",
    });
    expect(await getMyVote(db, H, addr(5))).toBe("pA");
    expect(await countRows(db, addr(5))).toBe(1);
  });

  it("balapan: dua vote paralel dari wallet yang sama → tepat satu masuk, tak membalik", async () => {
    await openWithFinalists(db);
    const results = await Promise.allSettled([
      castVote(db, H, addr(5), "pA"),
      castVote(db, H, addr(5), "pB"),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: "already_voted" });
    expect(await countRows(db, addr(5))).toBe(1);
  });

  it("alamat sama beda huruf (checksum vs lowercase) dianggap satu pemilih", async () => {
    await openWithFinalists(db);
    const checksum = "0xAbCdEf0000000000000000000000000000000001";
    for (const a of [checksum, checksum.toLowerCase()]) await ensureUser(db, a);
    await castVote(db, H, checksum, "pA");
    await expect(castVote(db, H, checksum.toLowerCase(), "pB")).rejects.toMatchObject({
      code: "already_voted",
    });
    expect(await getMyVote(db, H, checksum.toLowerCase())).toBe("pA");
  });

  it("vote yang sudah ada menolak vote kedua & tak pernah ditimpa (pre-check)", async () => {
    await openWithFinalists(db);
    // Simulasikan pemenang balapan yang menulis tepat setelah pre-check lawan.
    await db.run(
      `INSERT INTO votes (hackathon_id, voter_address, project_id) VALUES ('${H}','${addr(5)}','pA')`
    );
    await expect(castVote(db, H, addr(5), "pB")).rejects.toMatchObject({
      code: "already_voted",
    });
    expect(await getMyVote(db, H, addr(5))).toBe("pA");
  });

  it("finalis urut PRESENTASI (bukan nama) + nomor posisi; tanpa posisi → belakang, urut nama", async () => {
    await project(db, "pA", addr(1), "Alpha");
    await project(db, "pB", addr(2), "Bravo");
    await project(db, "pC", addr(3), "Charlie");
    await project(db, "pD", addr(4), "Delta");
    for (const id of ["pA", "pB", "pC", "pD"]) await markDemoDay(db, id, true);
    // Admin mengatur: Charlie tampil pertama, Alpha kedua. Bravo & Delta belum diatur.
    await db.run(
      `INSERT INTO presentation_order (project_id, hackathon_id, position, updated_by) VALUES ('pC','${H}',1,'${addr(8)}'),('pA','${H}',2,'${addr(8)}')`
    );
    const list = await listDemoDayProjects(db, H);
    expect(list.map((p) => [p.name, p.position])).toEqual([
      ["Charlie", 1],
      ["Alpha", 2],
      ["Bravo", 3],
      ["Delta", 4],
    ]);
    // positionSaved (internal admin) tak ikut terkirim ke pemilih.
    expect(list[0]).not.toHaveProperty("positionSaved");
  });

  it("tanpa urutan tersimpan sama sekali → fallback urut nama", async () => {
    await project(db, "p1", addr(1), "Zeta");
    await project(db, "p2", addr(2), "Beta");
    for (const id of ["p1", "p2"]) await markDemoDay(db, id, true);
    expect((await listDemoDayProjects(db, H)).map((p) => [p.name, p.position])).toEqual([
      ["Beta", 1],
      ["Zeta", 2],
    ]);
  });

  it("leaderboard (admin): semua finalis tampil, urut vote terbanyak (0 vote tetap ada)", async () => {
    await openWithFinalists(db);
    // pB: 2 vote, pA: 1 vote, pC: 0
    await castVote(db, H, addr(4), "pB");
    await castVote(db, H, addr(5), "pB");
    await castVote(db, H, addr(6), "pA");

    const lb = await voteLeaderboard(db, H);
    expect(lb.map((r) => [r.id, r.votes])).toEqual([
      ["pB", 2],
      ["pA", 1],
      ["pC", 0],
    ]);
    expect(await listDemoDayProjects(db, H)).toHaveLength(3);
  });

  it("screenState: waiting / open / closed", () => {
    expect(screenState(false, 0)).toBe("waiting");
    expect(screenState(true, 0)).toBe("open");
    expect(screenState(true, 12)).toBe("open");
    expect(screenState(false, 12)).toBe("closed");
  });

  it("voteScreen: total + finalis urut presentasi, TANPA angka per project", async () => {
    await openWithFinalists(db);
    await castVote(db, H, addr(4), "pB");
    await castVote(db, H, addr(5), "pB");
    const s = await voteScreen(db, H);
    expect(s.state).toBe("open");
    expect(s.total).toBe(2);
    expect(s.finalists.map((f) => f.id)).toEqual(["pA", "pB", "pC"]);
    for (const f of s.finalists)
      expect(Object.keys(f).sort()).toEqual(["id", "logoUrl", "name", "position"]);

    await setVotingSettings(db, H, { votingOpen: false });
    expect((await voteScreen(db, H)).state).toBe("closed");
    // Edisi tak dikenal → waiting kosong, bukan error.
    expect(await voteScreen(db, "tidak-ada")).toEqual({
      state: "waiting",
      total: 0,
      finalists: [],
    });
  });

  it("setVotingSettings hanya menyentuh votingOpen", async () => {
    await setVotingSettings(db, H, { votingOpen: true });
    expect((await getCurrentHackathon(db))?.votingOpen).toBe(true);
    await setVotingSettings(db, H, { votingOpen: false });
    expect((await getCurrentHackathon(db))?.votingOpen).toBe(false);
  });

  it("VoteError adalah instanceof Error (bisa dipetakan di route)", () => {
    expect(new VoteError("voting_closed", "x")).toBeInstanceOf(Error);
  });

  it("edisi demo: terisolasi, vote real, admin pemilik finalis mock TETAP bisa vote", async () => {
    await ensureDemoEdition(db, addr(1)); // idempotent
    await ensureDemoEdition(db, addr(1));

    // getCurrentHackathon TAK pernah balikin edisi demo (situs live aman).
    expect((await getCurrentHackathon(db))?.id).toBe(H);

    // 10 finalis mock (sama dengan finalis asli), voting sudah kebuka.
    const finalists = await listDemoDayProjects(db, DEMO_HACKATHON_ID);
    expect(finalists).toHaveLength(10);
    expect(finalists.map((f) => f.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // Urutan gladi = nomor seed (demo-proj-1..10), bukan alfabetis.
    expect(finalists.map((f) => f.id)).toEqual(
      Array.from({ length: 10 }, (_, i) => `demo-proj-${i + 1}`)
    );

    // addr(1) = admin pemicu = submitter & ketua semua finalis mock → tetap boleh vote.
    expect(await ownFinalistIds(db, DEMO_HACKATHON_ID, addr(1))).toEqual([]);
    const r = await castVote(db, DEMO_HACKATHON_ID, addr(1), finalists[0].id);
    expect(r.ok).toBe(true);
    expect(await getMyVote(db, DEMO_HACKATHON_ID, addr(1))).toBe(finalists[0].id);
    expect(
      (await voteLeaderboard(db, DEMO_HACKATHON_ID)).find((x) => x.id === finalists[0].id)?.votes
    ).toBe(1);
    // Aturan sekali-vote tetap berlaku di demo.
    await expect(castVote(db, DEMO_HACKATHON_ID, addr(1), finalists[1].id)).rejects.toMatchObject({
      code: "already_voted",
    });

    // Vote demo TAK bocor ke edisi live.
    expect(await getMyVote(db, H, addr(1))).toBeNull();
    expect(await countVotes(db, H)).toBe(0);

    // Reset dry-run mengosongkan vote demo, finalis tetap → admin bisa vote lagi.
    await resetDemoVotes(db);
    expect(await getMyVote(db, DEMO_HACKATHON_ID, addr(1))).toBeNull();
    expect(await listDemoDayProjects(db, DEMO_HACKATHON_ID)).toHaveLength(10);
    expect(await castVote(db, DEMO_HACKATHON_ID, addr(1), finalists[1].id)).toEqual({ ok: true });
  });

  it("pengecualian demo HANYA untuk edisi demo: admin pemilik project live tetap ditolak", async () => {
    await openWithFinalists(db);
    await expect(castVote(db, H, addr(1), "pA")).rejects.toMatchObject({ code: "own_project" });
  });
});
