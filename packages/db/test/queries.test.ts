import { describe, expect, it } from "vitest";
import { audit, ensureUser, getUser, recentAuditLogs, updateProfile } from "../src/queries";
import { rateLimit } from "../src/rate-limit";
import { testDb } from "./helpers";

const ADDR = "0x1111111111111111111111111111111111111111";

describe("users & profile (integration)", () => {
  it("ensureUser membuat user baru dengan role participant", async () => {
    const db = await testDb();
    await ensureUser(db, ADDR);
    const user = await getUser(db, ADDR);
    expect(user?.address).toBe(ADDR);
    expect(user?.role).toBe("participant");
  });

  it("ensureUser tidak menimpa profil yang sudah diisi", async () => {
    const db = await testDb();
    await ensureUser(db, ADDR);
    await updateProfile(db, ADDR, { username: "budi" });
    await ensureUser(db, ADDR); // sign-in kedua
    expect((await getUser(db, ADDR))?.username).toBe("budi");
  });

  it("updateProfile hanya mengubah user yang bersangkutan", async () => {
    const db = await testDb();
    const other = "0x2222222222222222222222222222222222222222";
    await ensureUser(db, ADDR);
    await ensureUser(db, other);
    await updateProfile(db, ADDR, { username: "budi", bio: "halo" });
    expect((await getUser(db, other))?.username).toBeNull();
  });
});

describe("rate limit (integration)", () => {
  it("mengizinkan sampai limit lalu menolak dalam window yang sama", async () => {
    const db = await testDb();
    const t = Date.now();
    for (let i = 0; i < 3; i++) {
      expect((await rateLimit(db, "k", 3, 60, t)).ok).toBe(true);
    }
    expect((await rateLimit(db, "k", 3, 60, t)).ok).toBe(false);
  });

  it("reset di window berikutnya", async () => {
    const db = await testDb();
    const t = Date.now();
    for (let i = 0; i < 4; i++) await rateLimit(db, "k", 3, 60, t);
    expect((await rateLimit(db, "k", 3, 60, t + 61_000)).ok).toBe(true);
  });

  it("key berbeda tidak saling mempengaruhi", async () => {
    const db = await testDb();
    const t = Date.now();
    for (let i = 0; i < 4; i++) await rateLimit(db, "a", 3, 60, t);
    expect((await rateLimit(db, "b", 3, 60, t)).ok).toBe(true);
  });
});

describe("audit log (integration)", () => {
  it("mencatat aksi dengan detail JSON dan urutan terbaru dulu", async () => {
    const db = await testDb();
    await audit(db, { actor: ADDR, action: "winner.set", target: "prize-1", detail: { p: "x" } });
    await audit(db, { actor: ADDR, action: "user.role", target: "0xabc" });
    const logs = await recentAuditLogs(db, 10);
    expect(logs).toHaveLength(2);
    expect(logs[0].action).toBe("user.role");
    expect(JSON.parse(logs[1].detail ?? "")).toEqual({ p: "x" });
  });
});

describe("skema (integration)", () => {
  it("menolak skor di luar 1-10 (CHECK constraint)", async () => {
    const db = await testDb();
    await db.run(`INSERT INTO hackathons (id, slug, name, year) VALUES ('h', 'h', 'H', 2026)`);
    await ensureUser(db, ADDR);
    await db.run(
      `INSERT INTO teams (id, hackathon_id, name, invite_code, leader_address) VALUES ('t', 'h', 'T', 'code', '${ADDR}')`
    );
    await db.run(
      `INSERT INTO projects (id, hackathon_id, team_id, name) VALUES ('p', 'h', 't', 'P')`
    );
    await db.run(`INSERT INTO criteria (id, hackathon_id, name) VALUES ('c', 'h', 'C')`);
    await expect(
      db.run(
        `INSERT INTO scores (id, project_id, judge_address, criterion_id, score) VALUES ('s', 'p', '${ADDR}', 'c', 11)`
      )
    ).rejects.toThrow();
  });
});
