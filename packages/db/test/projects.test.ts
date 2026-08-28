import { beforeEach, describe, expect, it } from "vitest";
import {
  canEditProject,
  createProject,
  getProjectForUser,
  listProjectsPaged,
  listSubmittedProjects,
  ProjectError,
  updateProject,
} from "../src/projects";
import { ensureUser } from "../src/queries";
import { createTeam, joinTeam } from "../src/teams";
import { testDb } from "./helpers";

const H = "iw3h-2026";
const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;
const baseInput = { name: "DemoDex", tagline: "swap cepat" };

async function seed(db: Awaited<ReturnType<typeof testDb>>) {
  await db.run(
    `INSERT INTO hackathons (id, slug, name, year, status) VALUES ('${H}','s','H',2026,'submission')`
  );
  await db.run(`INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai','${H}','T1','AI')`);
  await db.run(
    `INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('fin','${H}','T2','Fin')`
  );
  for (let i = 1; i <= 5; i++) await ensureUser(db, addr(i));
}

describe("projects (integration)", () => {
  let db: Awaited<ReturnType<typeof testDb>>;
  beforeEach(async () => {
    db = await testDb();
    await seed(db);
  });

  it("solo: create tanpa tim, hanya submitter yang bisa edit", async () => {
    const p = await createProject(db, {
      hackathonId: H,
      submitterAddress: addr(1),
      teamId: null,
      input: baseInput,
      trackIds: ["ai"],
    });
    expect(p.teamId).toBeNull();
    expect(p.status).toBe("submitted");
    expect(p.trackIds).toEqual(["ai"]);
    expect(await canEditProject(db, p, addr(1))).toBe(true);
    expect(await canEditProject(db, p, addr(2))).toBe(false);
    expect((await getProjectForUser(db, H, addr(1)))?.id).toBe(p.id);
  });

  it("tim: create oleh anggota, semua anggota bisa edit, non-anggota tidak", async () => {
    const team = await createTeam(db, H, addr(1), "Rocket");
    await joinTeam(db, H, addr(2), team.inviteCode);
    const p = await createProject(db, {
      hackathonId: H,
      submitterAddress: addr(1),
      teamId: team.id,
      input: baseInput,
      trackIds: ["ai", "fin"],
    });
    expect(p.teamId).toBe(team.id);
    expect(p.team?.memberAddresses).toHaveLength(2);
    expect(await canEditProject(db, p, addr(2))).toBe(true); // anggota lain
    expect(await canEditProject(db, p, addr(3))).toBe(false); // bukan anggota
    // getProjectForUser lewat tim juga untuk anggota lain
    expect((await getProjectForUser(db, H, addr(2)))?.id).toBe(p.id);
  });

  it("satu project per user/tim", async () => {
    await createProject(db, {
      hackathonId: H,
      submitterAddress: addr(1),
      teamId: null,
      input: baseInput,
      trackIds: ["ai"],
    });
    await expect(
      createProject(db, {
        hackathonId: H,
        submitterAddress: addr(1),
        teamId: null,
        input: baseInput,
        trackIds: ["ai"],
      })
    ).rejects.toMatchObject({ code: "already_has_project" });
  });

  it("submit untuk tim yang bukan timnya ditolak", async () => {
    const team = await createTeam(db, H, addr(1), "Rocket");
    await expect(
      createProject(db, {
        hackathonId: H,
        submitterAddress: addr(3),
        teamId: team.id,
        input: baseInput,
        trackIds: ["ai"],
      })
    ).rejects.toMatchObject({ code: "not_team_member" });
  });

  it("track kosong / tidak valid ditolak", async () => {
    await expect(
      createProject(db, {
        hackathonId: H,
        submitterAddress: addr(1),
        teamId: null,
        input: baseInput,
        trackIds: [],
      })
    ).rejects.toMatchObject({ code: "no_track" });
    await expect(
      createProject(db, {
        hackathonId: H,
        submitterAddress: addr(1),
        teamId: null,
        input: baseInput,
        trackIds: ["nope"],
      })
    ).rejects.toMatchObject({ code: "invalid_track" });
  });

  it("update mengganti field + tracks", async () => {
    const p = await createProject(db, {
      hackathonId: H,
      submitterAddress: addr(1),
      teamId: null,
      input: baseInput,
      trackIds: ["ai"],
    });
    const up = await updateProject(db, p.id, { name: "DemoDex v2", tagline: "lebih cepat" }, [
      "fin",
    ]);
    expect(up.name).toBe("DemoDex v2");
    expect(up.trackIds).toEqual(["fin"]);
  });

  it("listSubmittedProjects mengembalikan yang ter-submit", async () => {
    await createProject(db, {
      hackathonId: H,
      submitterAddress: addr(1),
      teamId: null,
      input: baseInput,
      trackIds: ["ai"],
    });
    const list = await listSubmittedProjects(db, H);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("DemoDex");
  });

  it("ProjectError adalah instanceof Error", async () => {
    const err = new ProjectError("not_found", "x");
    expect(err).toBeInstanceOf(Error);
  });

  describe("listProjectsPaged", () => {
    async function seedMany(db: Awaited<ReturnType<typeof testDb>>) {
      for (let i = 1; i <= 5; i++) {
        await createProject(db, {
          hackathonId: H,
          submitterAddress: addr(i),
          teamId: null,
          input: { name: i === 1 ? "ZetaSwap" : `Proj ${i}`, tagline: `tagline ${i}` },
          trackIds: [i % 2 === 0 ? "fin" : "ai"],
        });
      }
    }

    it("pagination + meta", async () => {
      await seedMany(db);
      const p1 = await listProjectsPaged(db, H, { page: 1, limit: 2 });
      expect(p1.items).toHaveLength(2);
      expect(p1.meta).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
      const p3 = await listProjectsPaged(db, H, { page: 3, limit: 2 });
      expect(p3.items).toHaveLength(1); // sisa
    });

    it("filter track", async () => {
      await seedMany(db);
      const fin = await listProjectsPaged(db, H, { track: "fin", limit: 50 });
      expect(fin.meta.total).toBe(2); // proj 2,4
      expect(fin.items.every((p) => p.trackIds.includes("fin"))).toBe(true);
    });

    it("search nama/tagline", async () => {
      await seedMany(db);
      const r = await listProjectsPaged(db, H, { q: "zeta" });
      expect(r.meta.total).toBe(1);
      expect(r.items[0].name).toBe("ZetaSwap");
    });

    it("sort name asc", async () => {
      await seedMany(db);
      const r = await listProjectsPaged(db, H, { sort: "name", limit: 50 });
      const names = r.items.map((p) => p.name);
      expect(names).toEqual([...names].sort());
    });
  });
});
