import { beforeEach, describe, expect, it, vi } from "vitest";
import { addr, jsonReq, makeDb } from "./helpers";

// Holder yang dibagi ke mock (vi.hoisted aman dipakai di factory vi.mock).
const store = vi.hoisted(() => ({
  db: null as unknown as Awaited<ReturnType<typeof import("./helpers").makeDb>>,
  actor: null as string | null,
}));

// db asli (@/lib/turso) diganti proxy → forward ke store.db (fresh tiap test).
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

// requireAuth ASLI sudah diuji tuntas di @iw3h/auth (SIWE, nonce, RBAC). Di sini
// kita mirror kontraknya (role dibaca segar dari DB) untuk menyuntik "siapa yang
// login" → fokus tes = otorisasi level-objek di dalam route.
vi.mock("@/lib/session", () => ({
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

import { GET as judgeData } from "@/app/api/judge/data/route";
import { PUT as judgeScore } from "@/app/api/judge/scores/route";
// Route handler ASLI (kode yang dites).
import { PUT as editProject } from "@/app/api/projects/[id]/route";
import { POST as submitProject } from "@/app/api/projects/route";
import { POST as joinTeamRoute } from "@/app/api/teams/join/route";
import { POST as createTeamRoute } from "@/app/api/teams/route";

const login = (a: string | null) => {
  store.actor = a;
};

async function seed() {
  const { createProject, ensureUser, setJudgeTracks, setUserRole } = await import("@iw3h/db");
  const db = store.db;
  await db.run(
    "INSERT INTO hackathons (id, slug, name, year, status) VALUES ('H','iw3h','H',2026,'submission')"
  );
  // Track id HARUS sama dengan enum di lib/types (dipakai schema submit).
  await db.run(
    "INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai-agents','H','T1','AI Agents')"
  );
  await db.run(
    "INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('finance-commerce','H','T2','Finance')"
  );
  await db.run(
    "INSERT INTO criteria (id, hackathon_id, name, weight) VALUES ('c1','H','Impact',1)"
  );
  for (const n of [1, 2, 3, 4, 6, 7]) await ensureUser(db, addr(n));
  await setUserRole(db, addr(3), "judge"); // juri di-assign track ai-agents
  await setUserRole(db, addr(4), "judge"); // juri tanpa assignment
  await setJudgeTracks(db, "H", addr(3), ["ai-agents"]);
  // Fixture project ter-submit: satu di ai-agents (owner 6), satu di finance (owner 7).
  const aiProj = await createProject(db, {
    hackathonId: "H",
    submitterAddress: addr(6),
    teamId: null,
    input: { name: "AI Proj" },
    trackIds: ["ai-agents"],
  });
  const finProj = await createProject(db, {
    hackathonId: "H",
    submitterAddress: addr(7),
    teamId: null,
    input: { name: "Fin Proj" },
    trackIds: ["finance-commerce"],
  });
  return { aiId: aiProj.id, finId: finProj.id };
}

const setPhase = (s: string) => store.db.run(`UPDATE hackathons SET status='${s}' WHERE id='H'`);

const validProject = { name: "My dApp", tracks: ["ai-agents"], mode: "solo" as const };

let ids: { aiId: string; finId: string };
beforeEach(async () => {
  store.db = await makeDb();
  store.actor = null;
  ids = await seed();
});

describe("POV: Anonim (belum sign-in)", () => {
  it("submit project → 401", async () => {
    login(null);
    expect((await submitProject(jsonReq(validProject))).status).toBe(401);
  });
  it("baca data juri → 401", async () => {
    login(null);
    expect((await judgeData()).status).toBe(401);
  });
  it("kirim skor → 401", async () => {
    login(null);
    expect((await judgeScore(jsonReq({ projectId: ids.aiId, entries: [] }))).status).toBe(401);
  });
});

describe("POV: Participant (user biasa)", () => {
  it("submit solo saat fase submission → 201", async () => {
    login(addr(1));
    const res = await submitProject(jsonReq(validProject));
    expect(res.status).toBe(201);
    expect((await res.json()).project.status).toBe("submitted");
  });

  it("submit dua kali → 409 (satu project per user)", async () => {
    login(addr(1));
    expect((await submitProject(jsonReq(validProject))).status).toBe(201);
    expect((await submitProject(jsonReq(validProject))).status).toBe(409);
  });

  it("URL berbahaya (javascript:) ditolak → 400 (anti stored-XSS)", async () => {
    login(addr(1));
    const res = await submitProject(jsonReq({ ...validProject, githubUrl: "javascript:alert(1)" }));
    expect(res.status).toBe(400);
  });

  it("URL http:// (bukan https) ditolak → 400", async () => {
    login(addr(1));
    const res = await submitProject(jsonReq({ ...validProject, demoUrl: "http://x.com" }));
    expect(res.status).toBe(400);
  });

  it("tidak bisa akses route juri → 403", async () => {
    login(addr(1));
    expect((await judgeData()).status).toBe(403);
    expect((await judgeScore(jsonReq({ projectId: ids.aiId, entries: [] }))).status).toBe(403);
  });

  it("submit di luar fase submission → 409", async () => {
    login(addr(1));
    await setPhase("judging");
    expect((await submitProject(jsonReq(validProject))).status).toBe(409);
  });

  it("rate-limit: percobaan ke-11 → 429", async () => {
    login(addr(1));
    // limit submit = 10 / 300s per IP. Body invalid → gagal di parse (400),
    // tapi rate-limit dicek lebih dulu; percobaan ke-11 harus 429.
    for (let i = 0; i < 10; i++) await submitProject(jsonReq({ bad: true }));
    expect((await submitProject(jsonReq({ bad: true }))).status).toBe(429);
  });
});

describe("POV: Judge (juri)", () => {
  beforeEach(() => setPhase("judging"));

  it("juri track ai hanya melihat project track ai", async () => {
    login(addr(3));
    const data = await (await judgeData()).json();
    expect(data.canScore).toBe(true);
    const names = data.projects.map((p: { name: string }) => p.name);
    expect(names).toContain("AI Proj");
    expect(names).not.toContain("Fin Proj");
  });

  it("juri track ai boleh menilai project ai → 200", async () => {
    login(addr(3));
    const res = await judgeScore(
      jsonReq({ projectId: ids.aiId, entries: [{ criterionId: "c1", score: 8 }] })
    );
    expect(res.status).toBe(200);
  });

  it("juri track ai DITOLAK menilai project fin → 403 (object-level authz)", async () => {
    login(addr(3));
    const res = await judgeScore(
      jsonReq({ projectId: ids.finId, entries: [{ criterionId: "c1", score: 8 }] })
    );
    expect(res.status).toBe(403);
  });

  it("juri tanpa assignment boleh menilai semua track", async () => {
    login(addr(4));
    const ai = await judgeScore(
      jsonReq({ projectId: ids.aiId, entries: [{ criterionId: "c1", score: 7 }] })
    );
    const fin = await judgeScore(
      jsonReq({ projectId: ids.finId, entries: [{ criterionId: "c1", score: 9 }] })
    );
    expect(ai.status).toBe(200);
    expect(fin.status).toBe(200);
  });

  it("skor di luar rentang 1..10 ditolak → 400", async () => {
    login(addr(3));
    const res = await judgeScore(
      jsonReq({ projectId: ids.aiId, entries: [{ criterionId: "c1", score: 99 }] })
    );
    expect(res.status).toBe(400);
  });

  it("menilai saat fase bukan judging → 409", async () => {
    login(addr(3));
    await setPhase("submission");
    const res = await judgeScore(
      jsonReq({ projectId: ids.aiId, entries: [{ criterionId: "c1", score: 8 }] })
    );
    expect(res.status).toBe(409);
  });
});

describe("POV: Tim & edit-by-wallet", () => {
  const editBody = { name: "Diedit anggota", tracks: ["ai-agents"] };
  const editReq = (id: string, body: unknown = editBody) =>
    editProject(jsonReq(body, { method: "PUT" }), { params: Promise.resolve({ id }) });

  // Bentuk tim (leader addr1 + anggota addr2) lalu submit project tim. Return id-nya.
  async function makeTeamProject() {
    login(addr(1));
    const created = await createTeamRoute(jsonReq({ name: "Rocket" }));
    expect(created.status).toBe(201);
    const code = (await created.json()).team.inviteCode as string;

    login(addr(2));
    expect((await joinTeamRoute(jsonReq({ code }))).status).toBe(200);

    login(addr(1)); // leader submit project tim
    const res = await submitProject(jsonReq({ ...validProject, mode: "team" }));
    expect(res.status).toBe(201);
    return (await res.json()).project.id as string;
  }

  it("submit mode team tanpa punya tim → 409", async () => {
    login(addr(1)); // belum bikin/join tim
    const res = await submitProject(jsonReq({ ...validProject, mode: "team" }));
    expect(res.status).toBe(409);
  });

  it("bikin tim dua kali (user sama) → 409", async () => {
    login(addr(1));
    expect((await createTeamRoute(jsonReq({ name: "Rocket" }))).status).toBe(201);
    expect((await createTeamRoute(jsonReq({ name: "Rocket 2" }))).status).toBe(409);
  });

  it("join dengan kode ngawur → 404", async () => {
    login(addr(2));
    expect((await joinTeamRoute(jsonReq({ code: "ZZZZ9999" }))).status).toBe(404);
  });

  it("bikin tim saat fase bukan registrasi/submission → 409", async () => {
    await setPhase("judging");
    login(addr(1));
    expect((await createTeamRoute(jsonReq({ name: "Rocket" }))).status).toBe(409);
  });

  it("anggota tim mana pun boleh edit project tim (edit-by-wallet)", async () => {
    const pid = await makeTeamProject();
    // leader (addr1) dan anggota (addr2) → dua-duanya boleh.
    login(addr(1));
    expect((await editReq(pid)).status).toBe(200);
    login(addr(2));
    const res = await editReq(pid, { name: "Diedit anggota 2", tracks: ["finance-commerce"] });
    expect(res.status).toBe(200);
    expect((await res.json()).project.trackIds).toEqual(["finance-commerce"]);
  });

  it("non-anggota TIDAK boleh edit project tim → 403", async () => {
    const pid = await makeTeamProject();
    login(addr(4)); // bukan anggota tim
    expect((await editReq(pid)).status).toBe(403);
  });

  it("solo: hanya submitter yang boleh edit (aiId milik addr6)", async () => {
    login(addr(6));
    expect((await editReq(ids.aiId)).status).toBe(200);
    login(addr(1)); // bukan pemilik
    expect((await editReq(ids.aiId)).status).toBe(403);
  });

  it("edit tanpa sign-in → 401", async () => {
    login(null);
    expect((await editReq(ids.aiId)).status).toBe(401);
  });
});
