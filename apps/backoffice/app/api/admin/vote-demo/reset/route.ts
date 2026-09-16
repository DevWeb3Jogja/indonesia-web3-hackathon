import { audit, resetDemoVotes } from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** POST /api/admin/vote-demo/reset — kosongkan vote edisi demo (dry-run). */
export async function POST() {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  await resetDemoVotes(db);
  await audit(db, { actor: auth.address, action: "vote.demo.reset", target: "iw3h-demo" });
  return NextResponse.json({ ok: true });
}
