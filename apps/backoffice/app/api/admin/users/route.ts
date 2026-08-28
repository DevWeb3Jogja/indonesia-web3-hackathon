import { listUsersPaged, type Role, type UserSort } from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["participant", "judge", "admin"];
const SORTS: UserSort[] = ["newest", "oldest"];

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
