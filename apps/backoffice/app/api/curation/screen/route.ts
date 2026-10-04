import { audit, canCurate, getCurrentHackathon, SCREEN_REASONS, screenProject } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { curationErrorResponse } from "@/lib/curation";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().min(1).max(100),
  decision: z.enum(["pass", "fail"]),
  reason: z.enum(SCREEN_REASONS).nullish(),
  note: z.string().trim().max(1000).nullish(),
});

/** PUT /api/curation/screen — tahap 1: lolos/gugur (satu keputusan per project). */
export async function PUT(req: Request) {
  const auth = await requireAuth("admin", "panitia");
  if (auth instanceof Response) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon || !canCurate(hackathon)) {
    return NextResponse.json({ error: "Kurasi belum/tidak dibuka" }, { status: 409 });
  }

  try {
    const res = await screenProject(db, {
      hackathonId: hackathon.id,
      reviewer: auth.address,
      ...parsed.data,
      note: parsed.data.note || null,
    });
    await audit(db, {
      actor: auth.address,
      action: "curation.screen",
      target: parsed.data.projectId,
      detail: {
        name: res.name,
        decision: parsed.data.decision,
        reason: parsed.data.reason ?? null,
        organization: res.organization,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return curationErrorResponse(e);
  }
}
