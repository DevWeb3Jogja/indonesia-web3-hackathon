import { beforeEach, describe, expect, it } from "vitest";
import { ensureUser } from "../src/queries";
import {
  createTeam,
  getCurrentHackathon,
  getMyTeam,
  joinTeam,
  leaveTeam,
  MAX_TEAM_SIZE,
  TeamError,
} from "../src/teams";
import { testDb } from "./helpers";

const H = "iw3h-2026";
const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;

async function seed(db: Awaited<ReturnType<typeof testDb>>) {
  await db.run(
    `INSERT INTO hackathons (id, slug, name, year, status) VALUES ('${H}','s','H',2026,'registration')`
  );
  for (let i = 1; i <= 8; i++) await ensureUser(db, addr(i));
}

describe("teams (integration)", () => {
  let db: Awaited<ReturnType<typeof testDb>>;
  beforeEach(async () => {
    db = await testDb();
    await seed(db);
  });

  it("create → leader + registrasi otomatis + invite code", async () => {
    const team = await createTeam(db, H, addr(1), "Rocket");
    expect(team.name).toBe("Rocket");
    expect(team.leaderAddress).toBe(addr(1));
    expect(team.members).toHaveLength(1);
    expect(team.members[0].role).toBe("leader");
    expect(team.inviteCode).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
    const reg = await db.run(`SELECT * FROM registrations WHERE address='${addr(1)}'`);
    expect(reg.rows.length).toBe(1);
  });

  it("join dengan kode → jadi member; getMyTeam konsisten untuk kedua orang", async () => {
    const t = await createTeam(db, H, addr(1), "Rocket");
    const joined = await joinTeam(db, H, addr(2), t.inviteCode.toLowerCase()); // case-insensitive
    expect(joined.members).toHaveLength(2);
    expect((await getMyTeam(db, H, addr(2)))?.id).toBe(t.id);
    expect((await getMyTeam(db, H, addr(1)))?.members).toHaveLength(2);
  });

  it("tidak boleh di dua tim sekaligus", async () => {
    const t = await createTeam(db, H, addr(1), "A");
    await createTeam(db, H, addr(2), "B");
    await expect(joinTeam(db, H, addr(2), t.inviteCode)).rejects.toThrow(TeamError);
    await expect(createTeam(db, H, addr(1), "C")).rejects.toThrow(TeamError);
  });

  it("kode salah ditolak", async () => {
    await expect(joinTeam(db, H, addr(1), "ZZZZZZZZ")).rejects.toMatchObject({
      code: "invalid_code",
    });
  });

  it("tim penuh ditolak", async () => {
    const t = await createTeam(db, H, addr(1), "Full");
    for (let i = 2; i <= MAX_TEAM_SIZE; i++) await joinTeam(db, H, addr(i), t.inviteCode);
    await expect(joinTeam(db, H, addr(MAX_TEAM_SIZE + 1), t.inviteCode)).rejects.toMatchObject({
      code: "team_full",
    });
  });

  it("member biasa keluar → tim tetap ada, leader tak berubah", async () => {
    const t = await createTeam(db, H, addr(1), "Rocket");
    await joinTeam(db, H, addr(2), t.inviteCode);
    await leaveTeam(db, H, addr(2));
    expect(await getMyTeam(db, H, addr(2))).toBeNull();
    const t1 = await getMyTeam(db, H, addr(1));
    expect(t1?.members).toHaveLength(1);
    expect(t1?.leaderAddress).toBe(addr(1));
  });

  it("leader keluar & ada anggota → anggota terlama dipromosikan", async () => {
    const t = await createTeam(db, H, addr(1), "Rocket");
    await joinTeam(db, H, addr(2), t.inviteCode);
    await joinTeam(db, H, addr(3), t.inviteCode);
    await leaveTeam(db, H, addr(1));
    const t2 = await getMyTeam(db, H, addr(2));
    expect(t2?.leaderAddress).toBe(addr(2));
    expect(t2?.members.find((m) => m.address === addr(2))?.role).toBe("leader");
    expect(t2?.members).toHaveLength(2);
  });

  it("leader sendirian keluar → tim dihapus", async () => {
    await createTeam(db, H, addr(1), "Solo");
    await leaveTeam(db, H, addr(1));
    expect(await getMyTeam(db, H, addr(1))).toBeNull();
    const rows = await db.run(`SELECT count(*) AS n FROM teams`);
    expect(Number(rows.rows[0].n)).toBe(0);
  });

  it("getCurrentHackathon mengembalikan edisi ter-seed", async () => {
    expect((await getCurrentHackathon(db))?.id).toBe(H);
  });
});
