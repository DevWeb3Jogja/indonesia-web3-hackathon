import { audit, getCurrentHackathon, HACKATHON_PHASES, setHackathonStatus } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(HACKATHON_PHASES as [string, ...string[]]) });

export async function PUT(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "Tidak ada hackathon" }, { status: 404 });

  await setHackathonStatus(
    db,
    hackathon.id,
    parsed.data.status as (typeof HACKATHON_PHASES)[number]
  );
  await audit(db, {
    actor: auth.address,
    action: "hackathon.status",
    target: hackathon.id,
    detail: { from: hackathon.status, to: parsed.data.status },
  });
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
