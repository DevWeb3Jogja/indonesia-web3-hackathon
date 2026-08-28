import { checkWalletSybil, clientIp, sybilPolicyFromEnv } from "@iw3h/auth";
import {
  canManageTeam,
  createTeam,
  getCurrentHackathon,
  getMyTeam,
  rateLimit,
  TeamError,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ team: null, hackathon: null });
  const team = await getMyTeam(db, hackathon.id, auth.address);
  return NextResponse.json({
    team,
    hackathon: { id: hackathon.id, name: hackathon.name, status: hackathon.status },
    canManage: canManageTeam(hackathon),
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const limit = await rateLimit(db, `team:${clientIp(req)}`, 10, 300);
  if (!limit.ok) return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });

  // Anti-sybil: gate reputasi on-chain (opt-in via SYBIL_MIN_TX).
  const sybil = await checkWalletSybil(auth.address as `0x${string}`, sybilPolicyFromEnv());
  if (!sybil.ok) {
    return NextResponse.json(
      { error: "Wallet belum memenuhi aktivitas on-chain minimum untuk buat tim" },
      { status: 403 }
    );
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nama tim tidak valid" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon || !canManageTeam(hackathon)) {
    return NextResponse.json({ error: "Pembentukan tim sedang ditutup" }, { status: 409 });
  }

  try {
    const team = await createTeam(db, hackathon.id, auth.address, parsed.data.name);
    return NextResponse.json({ team }, { status: 201 });
  } catch (e) {
    if (e instanceof TeamError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
