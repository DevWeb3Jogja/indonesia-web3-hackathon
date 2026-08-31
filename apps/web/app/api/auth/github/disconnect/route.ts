import { rateLimit, unlinkGithub } from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function POST() {
  const authed = await requireAuth();
  if (authed instanceof Response) return authed;
  const limit = await rateLimit(db, `gh-disc:${authed.address}`, 10);
  if (!limit.ok) return NextResponse.json({ error: "Terlalu sering" }, { status: 429 });
  await unlinkGithub(db, authed.address);
  return NextResponse.json({ ok: true });
}
