import { describe, expect, it } from "vitest";
import { ensureUser, getUser, linkGithub, unlinkGithub } from "../src/queries";
import { testDb } from "./helpers";

const A = "0xaaaa000000000000000000000000000000000001";
const B = "0xbbbb000000000000000000000000000000000002";

describe("linkGithub (verifikasi & anti-reuse)", () => {
  it("menautkan identitas GitHub terverifikasi + set githubUrl dari login", async () => {
    const db = await testDb();
    await ensureUser(db, A);
    const r = await linkGithub(db, A, { id: "12345", login: "budi" });
    expect(r).toEqual({ ok: true });
    const u = await getUser(db, A);
    expect(u?.githubId).toBe("12345");
    expect(u?.githubLogin).toBe("budi");
    expect(u?.githubUrl).toBe("https://github.com/budi");
  });

  it("menolak akun GitHub yang sama dipakai wallet lain (satu github = satu wallet)", async () => {
    const db = await testDb();
    await ensureUser(db, A);
    await ensureUser(db, B);
    await linkGithub(db, A, { id: "999", login: "andi" });
    const r = await linkGithub(db, B, { id: "999", login: "andi" });
    expect(r).toEqual({ ok: false, reason: "taken" });
    expect((await getUser(db, B))?.githubId).toBeNull();
  });

  it("relink githubId yang sama ke wallet yang sama tetap boleh (idempoten)", async () => {
    const db = await testDb();
    await ensureUser(db, A);
    await linkGithub(db, A, { id: "42", login: "old" });
    const r = await linkGithub(db, A, { id: "42", login: "new-handle" });
    expect(r).toEqual({ ok: true });
    expect((await getUser(db, A))?.githubLogin).toBe("new-handle");
  });

  it("unlink mengosongkan github + membebaskan id untuk wallet lain", async () => {
    const db = await testDb();
    await ensureUser(db, A);
    await ensureUser(db, B);
    await linkGithub(db, A, { id: "7", login: "x" });
    await unlinkGithub(db, A);
    const u = await getUser(db, A);
    expect(u?.githubId).toBeNull();
    expect(u?.githubUrl).toBeNull();
    // id 7 kini bebas → wallet B bisa pakai
    expect(await linkGithub(db, B, { id: "7", login: "x" })).toEqual({ ok: true });
  });
});
