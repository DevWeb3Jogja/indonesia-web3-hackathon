import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createDb, type Db } from "@iw3h/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** DB in-memory dengan skema PERSIS produksi (migrasi asli @iw3h/db). */
async function makeDb(): Promise<Db> {
  const db = createDb(":memory:");
  const dir = join(__dirname, "..", "..", "..", "packages", "db", "migrations");
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    for (const stmt of readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await db.$client.execute(stmt);
    }
  }
  return db;
}

const store = vi.hoisted(() => ({ db: null as unknown as Db, actor: null as string | null }));

vi.mock("@/lib/turso", () => ({
  db: new Proxy(
    {},
    {
      get(_t, prop) {
        const v = Reflect.get(store.db as object, prop, store.db);
        return typeof v === "function" ? v.bind(store.db) : v;
      },
    }
  ),
}));

// requireAuth/getSession asli diuji di @iw3h/auth. Mirror kontrak (role segar dari DB).
vi.mock("@/lib/session", () => ({
  auth: { getSession: async () => ({ address: store.actor ?? undefined }) },
  requireAuth: async (...roles: string[]) => {
    const { getUser } = await import("@iw3h/db");
    if (!store.actor) return Response.json({ error: "Belum sign-in" }, { status: 401 });
    const u = await getUser(store.db, store.actor);
    if (!u) return Response.json({ error: "User tidak ditemukan" }, { status: 401 });
    if (roles.length > 0 && !roles.includes(u.role)) {
      return Response.json({ error: "Tidak punya akses" }, { status: 403 });
    }
    return { address: u.address, role: u.role };
  },
}));

import { GET as leaderboardGet } from "@/app/api/leaderboard/route";
import { GET as screenGet } from "@/app/api/screen/route";
import { POST as votePost } from "@/app/api/vote/route";
import ScreenPage from "@/app/screen/page";

const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;
const OWNER_A = addr(1); // submitter finalis A
const OWNER_B = addr(2); // submitter finalis B
const VOTER = addr(3); // participant biasa, tak punya project
const JUDGE = addr(4);
const ADMIN = addr(5);
const VOTER2 = addr(6);

const login = (a: string | null) => {
  store.actor = a;
};
const vote = (projectId: string, demo?: boolean) =>
  votePost(
    new Request("http://test/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, ...(demo ? { demo } : {}) }),
    })
  );
const screen = (demo = false) =>
  screenGet(new Request(`http://test/api/screen${demo ? "?demo=1" : ""}`));
const leaderboard = (demo = false) =>
  leaderboardGet(new Request(`http://test/api/leaderboard${demo ? "?demo=1" : ""}`));
const page = (demo = false) =>
  ScreenPage({ searchParams: Promise.resolve(demo ? { demo: "1" } : {}) });

let pA = "";
let pB = "";

async function openVoting(on = true) {
  const { setVotingSettings } = await import("@iw3h/db");
  await setVotingSettings(store.db, "H", { votingOpen: on });
}

beforeEach(async () => {
  store.db = await makeDb();
  store.actor = null;
  const { createProject, ensureUser, markDemoDay, setUserRole } = await import("@iw3h/db");
  const db = store.db;
  await db.run(
    "INSERT INTO hackathons (id, slug, name, year, status) VALUES ('H','iw3h','H',2026,'judging')"
  );
  await db.run("INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai','H','T1','AI')");
  for (const a of [OWNER_A, OWNER_B, VOTER, JUDGE, ADMIN, VOTER2]) await ensureUser(db, a);
  await setUserRole(db, JUDGE, "judge");
  await setUserRole(db, ADMIN, "admin");
  const mk = async (owner: string, name: string) =>
    (
      await createProject(db, {
        hackathonId: "H",
        submitterAddress: owner,
        teamId: null,
        input: { name },
        trackIds: ["ai"],
      })
    ).id;
  pA = await mk(OWNER_A, "Alpha");
  pB = await mk(OWNER_B, "Bravo");
  await markDemoDay(db, pA, true);
  await markDemoDay(db, pB, true);
});

describe("POST /api/vote", () => {
  it("anon 401; voting tertutup 409", async () => {
    login(null);
    expect((await vote(pA)).status).toBe(401);
    login(VOTER);
    expect((await vote(pA)).status).toBe(409);
  });

  it("siapa pun yang sign-in boleh vote: participant tanpa project, juri, admin", async () => {
    await openVoting();
    for (const who of [VOTER, JUDGE, ADMIN]) {
      login(who);
      const res = await vote(pA);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    }
  });

  it("project sendiri → 403 own_project dengan pesan Indonesia; project lain tetap boleh", async () => {
    await openVoting();
    login(OWNER_A);
    const res = await vote(pA);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("own_project");
    expect(body.error).toMatch(/project timmu sendiri/);
    expect((await vote(pB)).status).toBe(200);
  });

  it("vote kedua (sama / beda project) → 409 already_voted, pilihan pertama tetap", async () => {
    await openVoting();
    login(VOTER);
    expect((await vote(pA)).status).toBe(200);
    for (const id of [pB, pA]) {
      const res = await vote(id);
      expect(res.status).toBe(409);
      expect((await res.json()).code).toBe("already_voted");
    }
    const { getMyVote } = await import("@iw3h/db");
    expect(await getMyVote(store.db, "H", VOTER)).toBe(pA);
  });

  it("project non-finalis → 400; body tak valid → 400", async () => {
    await openVoting();
    login(VOTER);
    expect((await vote("ngawur")).status).toBe(400);
    const bad = await votePost(
      new Request("http://test/api/vote", { method: "POST", body: "bukan json" })
    );
    expect(bad.status).toBe(400);
  });

  it("demo: hanya admin; admin pemilik finalis mock tetap bisa vote (sekali)", async () => {
    // Non-admin minta demo → diperlakukan sebagai edisi live (voting tertutup → 409).
    login(VOTER);
    expect((await vote("demo-proj-1", true)).status).toBe(409);
    login(ADMIN);
    expect((await vote("demo-proj-1", true)).status).toBe(200);
    expect((await vote("demo-proj-2", true)).status).toBe(409);
  });
});

describe("GET /api/leaderboard — admin-only, apa pun nilai leaderboard_public", () => {
  it("anon 401; participant & juri 403 walau leaderboard_public=1; admin 200", async () => {
    await store.db.run("UPDATE hackathons SET leaderboard_public = 1 WHERE id = 'H'");
    login(null);
    expect((await leaderboard()).status).toBe(401);
    for (const who of [VOTER, JUDGE, OWNER_A]) {
      login(who);
      expect((await leaderboard()).status).toBe(403);
      expect((await leaderboard(true)).status).toBe(403);
    }
    login(ADMIN);
    const res = await leaderboard();
    expect(res.status).toBe(200);
    expect((await res.json()).rows).toHaveLength(2);
  });
});

describe("GET /api/screen", () => {
  it("anon 401; participant & juri 403; admin 200", async () => {
    login(null);
    expect((await screen()).status).toBe(401);
    for (const who of [VOTER, JUDGE]) {
      login(who);
      expect((await screen()).status).toBe(403);
      expect((await screen(true)).status).toBe(403);
    }
    login(ADMIN);
    expect((await screen()).status).toBe(200);
  });

  it("state waiting → open → closed; total benar; TAK ADA angka per project", async () => {
    login(ADMIN);
    let json = await (await screen()).json();
    expect(json).toMatchObject({ state: "waiting", total: 0 });

    await openVoting();
    for (const who of [VOTER, VOTER2, JUDGE]) {
      login(who);
      await vote(pA);
    }
    login(ADMIN);
    const res = await screen();
    expect(res.headers.get("cache-control")).toBe("no-store");
    json = await res.json();
    expect(json.state).toBe("open");
    expect(json.total).toBe(3);
    expect(json.finalists.map((f: { position: number }) => f.position)).toEqual([1, 2]);
    for (const f of json.finalists) {
      expect(Object.keys(f).sort()).toEqual(["id", "logoUrl", "name", "position"]);
    }
    // Sabuk pengaman: angka "3" untuk Alpha tak boleh muncul sebagai field apa pun.
    expect(JSON.stringify(json)).not.toMatch(/"votes"|"count"/);

    await openVoting(false);
    json = await (await screen()).json();
    expect(json).toMatchObject({ state: "closed", total: 3 });
  });

  it("?demo=1 membaca edisi demo (terpisah dari live)", async () => {
    login(ADMIN);
    // Belum di-seed (halaman /screen yang men-seed) → waiting kosong, bukan error.
    expect(await (await screen(true)).json()).toEqual({
      state: "waiting",
      total: 0,
      finalists: [],
    });
    await vote("demo-proj-3", true); // men-seed edisi demo + 1 vote
    const json = await (await screen(true)).json();
    expect(json).toMatchObject({ state: "open", total: 1 });
    expect(json.finalists).toHaveLength(10);
    expect((await (await screen()).json()).total).toBe(0);
  });
});

describe("/screen page (guard di page)", () => {
  it("non-admin (anon, participant, juri) → null, tanpa data", async () => {
    for (const who of [null, VOTER, JUDGE]) {
      login(who);
      expect(await page()).toBeNull();
      expect(await page(true)).toBeNull();
    }
  });

  it("non-admin ?demo=1 TIDAK men-seed edisi demo", async () => {
    login(VOTER);
    await page(true);
    const r = await store.db.run("SELECT COUNT(*) AS n FROM hackathons WHERE id = 'iw3h-demo'");
    expect(Number(r.rows[0].n)).toBe(0);
  });

  it("admin → props layar: QR SVG, URL dari env, data tanpa angka per project", async () => {
    login(ADMIN);
    const el = (await page()) as unknown as {
      props: {
        demo: boolean;
        qrSrc: string;
        urlText: string;
        initial: { state: string; finalists: Record<string, unknown>[] };
      };
    };
    expect(el).not.toBeNull();
    expect(el.props.demo).toBe(false);
    expect(el.props.qrSrc.startsWith("data:image/svg+xml")).toBe(true);
    expect(el.props.urlText).toBe("vote.indonesiaweb3hack.xyz");
    expect(el.props.initial.state).toBe("waiting");
    for (const f of el.props.initial.finalists) expect(f).not.toHaveProperty("votes");

    const demo = (await page(true)) as unknown as typeof el;
    expect(demo.props.demo).toBe(true);
    expect(demo.props.urlText).toBe("vote.indonesiaweb3hack.xyz/?demo=1");
    expect(demo.props.initial.finalists).toHaveLength(10);
  });
});
