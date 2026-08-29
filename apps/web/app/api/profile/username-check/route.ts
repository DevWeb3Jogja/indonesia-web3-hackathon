import { isUsernameTaken } from "@iw3h/db";
import { NextResponse } from "next/server";
import { impersonates, isClean } from "@/lib/filter";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** GET /api/profile/username-check?u=<name> — { available } untuk cek live. */
export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const u = (new URL(req.url).searchParams.get("u") ?? "").trim();
  if (u.length < 3 || u.length > 32 || !/^[a-zA-Z0-9_-]+$/.test(u)) {
    return NextResponse.json({ available: false, invalid: true });
  }
  if (!isClean(u) || impersonates(u)) {
    return NextResponse.json({ available: false, invalid: true });
  }
  const taken = await isUsernameTaken(db, u, auth.address);
  return NextResponse.json({ available: !taken });
}
