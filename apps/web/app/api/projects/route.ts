import { checkWalletSybil, clientIp, sybilPolicyFromEnv } from "@iw3h/auth";
import { isContract } from "@iw3h/auth/chains";
import {
  canSubmitProject,
  createProject,
  getCurrentHackathon,
  getMyTeam,
  getPublicProfiles,
  getUser,
  isProfileComplete,
  listProjectsPaged,
  ProjectError,
  type ProjectSort,
  rateLimit,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { createProjectSchema, splitFields } from "@/lib/project-schema";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";
import type { NetworkId } from "@/lib/types";

export const dynamic = "force-dynamic";

const SORTS: ProjectSort[] = ["newest", "oldest", "name"];

/** Galeri publik — project ter-submit (tanpa auth), paginated + search/filter/sort. */
export async function GET(req: Request) {
  try {
    const hackathon = await getCurrentHackathon(db);
    const emptyMeta = { page: 1, limit: 12, total: 0, totalPages: 1 };
    if (!hackathon) return NextResponse.json({ items: [], meta: emptyMeta });

    const sp = new URL(req.url).searchParams;
    const sortParam = sp.get("sort");
    const sort = SORTS.includes(sortParam as ProjectSort) ? (sortParam as ProjectSort) : "newest";

    const { items, meta } = await listProjectsPaged(db, hackathon.id, {
      page: Number(sp.get("page")) || 1,
      limit: Number(sp.get("limit")) || 12,
      q: sp.get("q") ?? undefined,
      track: sp.get("track") ?? undefined,
      sort,
    });

    // Anggota per project (tim → member, solo → submitter) untuk avatar stack.
    const membersOf = (p: (typeof items)[number]) =>
      p.team ? p.team.memberAddresses : [p.submitterAddress];
    const allAddrs = [...new Set(items.flatMap(membersOf))];
    const profiles = await getPublicProfiles(db, allAddrs);
    const profOf = (a: string) => profiles.find((x) => x.address === a);

    const cards = items.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline ?? "",
      logoUrl: p.logoUrl ?? "",
      trackIds: p.trackIds,
      teamName: p.team?.name ?? null, // null = solo
      members: membersOf(p).map((a) => ({
        address: a,
        githubUrl: profOf(a)?.githubUrl ?? null,
        username: profOf(a)?.username ?? null,
      })),
    }));
    // Cache di CDN 30s — endpoint publik read-only, lindungi DB dari hammering (DoS).
    return NextResponse.json(
      { items: cards, meta },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (err) {
    // Alasan asli (env kurang → ZodError, token Turso invalid → 401 libsql, DB down)
    // muncul di Vercel logs; publik cukup dapat 503, bukan 500 kosong yang misterius.
    console.error("[GET /api/projects] gagal:", err);
    return NextResponse.json({ error: "Gagal memuat project, coba lagi." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const limit = await rateLimit(db, `project:${clientIp(req)}`, 10, 300);
  if (!limit.ok) return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });

  // Wajib lengkapi profil (username & email) sebelum submit — backstop server;
  // UI juga menahan di depan (lihat mine.profileComplete).
  if (!isProfileComplete(await getUser(db, auth.address))) {
    return NextResponse.json(
      {
        error: "Lengkapi profil (username & email) dulu sebelum submit",
        code: "profile_incomplete",
      },
      { status: 400 }
    );
  }

  // Anti-sybil: gate reputasi on-chain (opt-in via SYBIL_MIN_TX).
  const sybil = await checkWalletSybil(auth.address as `0x${string}`, sybilPolicyFromEnv());
  if (!sybil.ok) {
    return NextResponse.json(
      { error: "Wallet belum memenuhi aktivitas on-chain minimum untuk submit" },
      { status: 403 }
    );
  }

  const parsed = createProjectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", detail: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon || !canSubmitProject(hackathon)) {
    return NextResponse.json({ error: "Submission sedang ditutup" }, { status: 409 });
  }

  const { mode, ...rest } = parsed.data;
  const { tracks, fields } = splitFields(rest);

  // teamId diturunkan di server (tidak dipercayakan ke client).
  let teamId: string | null = null;
  if (mode === "team") {
    const team = await getMyTeam(db, hackathon.id, auth.address);
    if (!team) {
      return NextResponse.json({ error: "Kamu belum punya tim" }, { status: 409 });
    }
    teamId = team.id;
  }

  // Verifikasi bytecode kontrak (kalau diisi) — saring submission asal-asalan.
  if (fields.contractAddress && fields.network) {
    const deployed = await isContract(
      fields.network as NetworkId,
      fields.contractAddress as `0x${string}`
    ).catch(() => null);
    if (deployed === false) {
      return NextResponse.json(
        { error: "Alamat kontrak tidak ditemukan di network yang dipilih" },
        { status: 400 }
      );
    }
  }

  try {
    const project = await createProject(db, {
      hackathonId: hackathon.id,
      submitterAddress: auth.address,
      teamId,
      input: fields,
      trackIds: tracks,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    if (e instanceof ProjectError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
