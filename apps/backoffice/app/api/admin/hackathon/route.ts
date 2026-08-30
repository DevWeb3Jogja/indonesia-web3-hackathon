import { audit, ConfigError, getCurrentHackathon, updateHackathon } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

// Deadline: string bebas (date-only / ISO) — beforeDeadline() sudah tahan format.
const dateStr = z.string().trim().max(40).nullish();
const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  registrationOpensAt: dateStr,
  registrationClosesAt: dateStr,
  submissionOpensAt: dateStr,
  submissionClosesAt: dateStr,
  judgingClosesAt: dateStr,
  winnersAnnouncedAt: dateStr,
});

export async function PUT(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "No hackathon" }, { status: 404 });

  try {
    await updateHackathon(db, hackathon.id, parsed.data);
    await audit(db, {
      actor: auth.address,
      action: "hackathon.settings",
      target: hackathon.id,
      detail: parsed.data,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ConfigError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }
}
