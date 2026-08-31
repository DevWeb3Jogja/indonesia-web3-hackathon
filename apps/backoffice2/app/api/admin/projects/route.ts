import {
  getCurrentHackathon,
  listAllProjectsPaged,
  PROJECT_SORTS,
  type ProjectSort,
  type ProjectStatusFilter,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const STATUSES: ProjectStatusFilter[] = ["submitted", "draft", "disqualified"];

/** GET /api/admin/projects — SEMUA status, meta page+cursor, search, filter status/track, sort. */
export async function GET(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) {
    return NextResponse.json({
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 1, nextCursor: null, hasMore: false },
    });
  }

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const sort = sp.get("sort");
  const result = await listAllProjectsPaged(db, hackathon.id, {
    page: Number(sp.get("page")) || 1,
    limit: Number(sp.get("limit")) || 20,
    cursor: sp.get("cursor") ?? undefined,
    q: sp.get("q") ?? undefined,
    status: STATUSES.includes(status as ProjectStatusFilter)
      ? (status as ProjectStatusFilter)
      : undefined,
    track: sp.get("track") ?? undefined,
    sort: PROJECT_SORTS.includes(sort as ProjectSort) ? (sort as ProjectSort) : undefined,
  });
  return NextResponse.json(result);
}
