import { clientIp } from "@iw3h/auth";
import { canManageTeam, getCurrentHackathon, joinTeam, rateLimit, TeamError } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const joinSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z]{8}$/, "Kode undangan 8 karakter"),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const limit = await rateLimit(db, `team-join:${clientIp(req)}`, 10, 300);
  if (!limit.ok) return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });

  const parsed = joinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kode tidak valid" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon || !canManageTeam(hackathon)) {
    return NextResponse.json({ error: "Pembentukan tim sedang ditutup" }, { status: 409 });
  }

  try {
    const team = await joinTeam(db, hackathon.id, auth.address, parsed.data.code);
    return NextResponse.json({ team });
  } catch (e) {
    if (e instanceof TeamError) {
      const status = e.code === "invalid_code" ? 404 : 409;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }
}
