import {
  audit,
  ensureUser,
  getUser,
  listUsersPaged,
  type Role,
  setUserRole,
  type UserSort,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["participant", "judge", "admin"];
const SORTS: UserSort[] = ["newest", "oldest"];

const createSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Alamat wallet tidak valid"),
  role: z.enum(["participant", "judge", "admin"]).default("participant"),
});

/** POST /api/admin/users — pra-daftar wallet (belum sign-in) + set role. */
export async function POST(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isAddress(parsed.data.address)) {
    return NextResponse.json({ error: "Alamat wallet tidak valid" }, { status: 400 });
  }
  // Checksum agar cocok dengan alamat yang disimpan SIWE saat wallet sign-in nanti.
  const address = getAddress(parsed.data.address);

  if (await getUser(db, address)) {
    return NextResponse.json({ error: "User sudah ada", code: "exists" }, { status: 409 });
  }

  await ensureUser(db, address);
  if (parsed.data.role !== "participant") await setUserRole(db, address, parsed.data.role);
  await audit(db, {
    actor: auth.address,
    action: "user.create",
    target: address,
    detail: { role: parsed.data.role },
  });
  return NextResponse.json({ ok: true, address, role: parsed.data.role }, { status: 201 });
}

/** GET /api/admin/users — meta pagination (page+cursor), search, filter role, sort. */
export async function GET(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const sp = new URL(req.url).searchParams;
  const role = sp.get("role");
  const sort = sp.get("sort");
  const result = await listUsersPaged(db, {
    page: Number(sp.get("page")) || 1,
    limit: Number(sp.get("limit")) || 20,
    cursor: sp.get("cursor") ?? undefined,
    q: sp.get("q") ?? undefined,
    role: ROLES.includes(role as Role) ? (role as Role) : undefined,
    sort: SORTS.includes(sort as UserSort) ? (sort as UserSort) : undefined,
  });
  return NextResponse.json(result);
}
