import { beforeEach, describe, expect, it, vi } from "vitest";
import { addr, makeDb } from "./helpers";

const store = vi.hoisted(() => ({
  db: null as unknown as Awaited<ReturnType<typeof import("./helpers").makeDb>>,
  actor: null as string | null,
}));

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

vi.mock("@/lib/auth", () => ({
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

import { GET as auditList } from "@/app/api/admin/audit/route";
import { DELETE as critDel, PUT as critPut } from "@/app/api/admin/criteria/[id]/route";
import { POST as critPost } from "@/app/api/admin/criteria/route";
import { PUT as hackathonPut } from "@/app/api/admin/hackathon/route";
import { DELETE as prizeDel, PUT as prizePut } from "@/app/api/admin/prizes/[id]/route";
import { POST as prizePost } from "@/app/api/admin/prizes/route";
import { GET as projectsList } from "@/app/api/admin/projects/route";
import { DELETE as trackDel, PUT as trackPut } from "@/app/api/admin/tracks/[id]/route";
import { POST as trackPost } from "@/app/api/admin/tracks/route";
import { GET as usersList } from "@/app/api/admin/users/route";

const login = (a: string | null) => {
  store.actor = a;
};
const body = (method: string, b: unknown) =>
  new Request("http://test/x", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(b),
  });
const get = (qs = "") => new Request(`http://test/x?${qs}`);
const withId = (id: string) => ({ params: Promise.resolve({ id }) });

async function seed() {
  const { ensureUser, setUserRole } = await import("@iw3h/db");
  const db = store.db;
  await db.run(
    "INSERT INTO hackathons (id, slug, name, year, status) VALUES ('H','iw3h','H',2026,'submission')"
  );
  for (const n of [1, 5]) await ensureUser(db, addr(n));
  await setUserRole(db, addr(5), "admin");
}

beforeEach(async () => {
  store.db = await makeDb();
  store.actor = null;
  await seed();
});

describe("Admin config CRUD — RBAC", () => {
  it("anon → 401, participant → 403 di route CRUD", async () => {
    login(null);
    expect((await trackPost(body("POST", { code: "AI", name: "AI" }))).status).toBe(401);
    login(addr(1));
    expect((await trackPost(body("POST", { code: "AI", name: "AI" }))).status).toBe(403);
    expect((await usersList(get())).status).toBe(403);
  });
});

describe("Admin: Tracks CRUD + delete guard", () => {
  beforeEach(() => login(addr(5)));

  it("create → update → delete (tak terpakai) → 200/201", async () => {
    const created = await trackPost(body("POST", { code: "AI", name: "AI Agents" }));
    expect(created.status).toBe(201);
    const id = (await created.json()).id as string;
    expect((await trackPut(body("PUT", { name: "AI v2" }), withId(id))).status).toBe(200);
    expect((await trackDel(new Request("http://x"), withId(id))).status).toBe(200);
  });

  it("input invalid → 400; update id tak ada → 404", async () => {
    expect((await trackPost(body("POST", { code: "", name: "x" }))).status).toBe(400);
    expect((await trackPut(body("PUT", { name: "zz" }), withId("track_missing"))).status).toBe(404);
  });

  it("hapus track yang masih dipakai project → 409", async () => {
    const { createProject } = await import("@iw3h/db");
    const created = await trackPost(body("POST", { code: "AI", name: "AI" }));
    const id = (await created.json()).id as string;
    await createProject(store.db, {
      hackathonId: "H",
      submitterAddress: addr(1),
      teamId: null,
      input: { name: "P" },
      trackIds: [id],
    });
    expect((await trackDel(new Request("http://x"), withId(id))).status).toBe(409);
  });
});

describe("Admin: Criteria CRUD + delete guard", () => {
  beforeEach(() => login(addr(5)));

  it("create → delete (tak terpakai) → ok", async () => {
    const created = await critPost(body("POST", { name: "Impact", weight: 3 }));
    expect(created.status).toBe(201);
    const id = (await created.json()).id as string;
    expect((await critPut(body("PUT", { weight: 5 }), withId(id))).status).toBe(200);
    expect((await critDel(new Request("http://x"), withId(id))).status).toBe(200);
  });

  it("hapus kriteria yang sudah dipakai menilai → 409", async () => {
    const { createProject, upsertScores } = await import("@iw3h/db");
    // butuh track + project + criterion + skor
    const t = (await (await trackPost(body("POST", { code: "AI", name: "AI" }))).json()).id;
    const proj = await createProject(store.db, {
      hackathonId: "H",
      submitterAddress: addr(1),
      teamId: null,
      input: { name: "P" },
      trackIds: [t],
    });
    const cid = (await (await critPost(body("POST", { name: "Impact" }))).json()).id;
    await upsertScores(store.db, proj.id, addr(5), [{ criterionId: cid, score: 8 }]);
    expect((await critDel(new Request("http://x"), withId(cid))).status).toBe(409);
  });
});

describe("Admin: Prizes CRUD", () => {
  beforeEach(() => login(addr(5)));

  it("create → update → delete; hapus prize buang pemenangnya", async () => {
    const { createProject, setWinner, listWinners } = await import("@iw3h/db");
    const created = await prizePost(body("POST", { name: "Grand", amountUsd: 1000 }));
    expect(created.status).toBe(201);
    const pid = (await created.json()).id as string;
    expect((await prizePut(body("PUT", { amountUsd: 2000 }), withId(pid))).status).toBe(200);

    const proj = await createProject(store.db, {
      hackathonId: "H",
      submitterAddress: addr(1),
      teamId: null,
      input: { name: "P" },
      trackIds: [(await (await trackPost(body("POST", { code: "AI", name: "AI" }))).json()).id],
    });
    await setWinner(store.db, pid, proj.id);
    expect(await listWinners(store.db)).toHaveLength(1);
    expect((await prizeDel(new Request("http://x"), withId(pid))).status).toBe(200);
    expect(await listWinners(store.db)).toHaveLength(0); // winner ikut terhapus
  });

  it("prize dengan track edisi lain / tak valid → 400", async () => {
    expect((await prizePost(body("POST", { name: "X", trackId: "track_ngawur" }))).status).toBe(
      400
    );
  });
});

describe("Admin: Hackathon settings", () => {
  beforeEach(() => login(addr(5)));

  it("edit nama + deadline → 200", async () => {
    const res = await hackathonPut(
      body("PUT", { name: "IW3H 2026", submissionClosesAt: "2026-10-01" })
    );
    expect(res.status).toBe(200);
    const { getCurrentHackathon } = await import("@iw3h/db");
    expect((await getCurrentHackathon(store.db))?.name).toBe("IW3H 2026");
  });
});

describe("Admin: list data banyak — meta pagination + cursor + search + filter", () => {
  beforeEach(async () => {
    const { ensureUser, setUserRole } = await import("@iw3h/db");
    // 6 user peserta + admin (addr5). addr9 dipakai untuk uji search.
    for (const n of [10, 11, 12, 13, 14, 9]) await ensureUser(store.db, addr(n));
    await setUserRole(store.db, addr(9), "judge");
    login(addr(5));
  });

  it("users: meta lengkap + cursor tanpa overlap antar halaman", async () => {
    const p1 = await (await usersList(get("limit=3"))).json();
    expect(p1.meta).toMatchObject({ limit: 3, hasMore: true });
    expect(typeof p1.meta.total).toBe("number");
    expect(p1.meta.nextCursor).toBeTruthy();
    expect(p1.items).toHaveLength(3);

    const p2 = await (
      await usersList(get(`limit=3&cursor=${encodeURIComponent(p1.meta.nextCursor)}`))
    ).json();
    const a1 = new Set(p1.items.map((u: { address: string }) => u.address));
    for (const u of p2.items) expect(a1.has(u.address)).toBe(false); // tidak tumpang tindih
  });

  it("users: filter role", async () => {
    const judges = await (await usersList(get("role=judge&limit=50"))).json();
    expect(judges.items.every((u: { role: string }) => u.role === "judge")).toBe(true);
    expect(judges.items.some((u: { address: string }) => u.address === addr(9))).toBe(true);
  });

  it("users: search by address (full = unik)", async () => {
    // addr() hampir semua nol → pakai alamat penuh biar substring-nya unik.
    const r = await (await usersList(get(`q=${addr(9)}`))).json();
    expect(r.meta.total).toBe(1);
    expect(r.items[0].address).toBe(addr(9));
  });

  it("projects: filter status (semua status muncul untuk admin)", async () => {
    const { createProject, setProjectStatus } = await import("@iw3h/db");
    const t = (await (await trackPost(body("POST", { code: "AI", name: "AI" }))).json()).id;
    const p = await createProject(store.db, {
      hackathonId: "H",
      submitterAddress: addr(10),
      teamId: null,
      input: { name: "P" },
      trackIds: [t],
    });
    await setProjectStatus(store.db, p.id, "disqualified");
    const dq = await (await projectsList(get("status=disqualified"))).json();
    expect(dq.items.every((x: { status: string }) => x.status === "disqualified")).toBe(true);
    const sub = await (await projectsList(get("status=submitted"))).json();
    expect(sub.items.some((x: { id: string }) => x.id === p.id)).toBe(false);
  });

  it("audit: mutasi tercatat + meta pagination", async () => {
    await trackPost(body("POST", { code: "AI", name: "AI" })); // hasilkan audit track.create
    const r = await (await auditList(get("limit=10"))).json();
    expect(r.meta).toHaveProperty("nextCursor");
    expect(r.items.some((a: { action: string }) => a.action === "track.create")).toBe(true);
  });
});
