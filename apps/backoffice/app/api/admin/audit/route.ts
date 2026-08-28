import { listAuditPaged } from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** GET /api/admin/audit — meta page+cursor(id), search action/target/actor, filter. */
export async function GET(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const sp = new URL(req.url).searchParams;
  const result = await listAuditPaged(db, {
    page: Number(sp.get("page")) || 1,
    limit: Number(sp.get("limit")) || 20,
    cursor: sp.get("cursor") ?? undefined,
    q: sp.get("q") ?? undefined,
    action: sp.get("action") ?? undefined,
    actor: sp.get("actor") ?? undefined,
  });
  return NextResponse.json(result);
}
