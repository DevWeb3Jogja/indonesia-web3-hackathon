import { audit, canCurate, getCurrentHackathon, saveCurationReview } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { curationErrorResponse } from "@/lib/curation";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().min(1).max(100),
  entries: z
    .array(
      z.object({ criterionId: z.string().min(1).max(100), score: z.number().int().min(1).max(5) })
    )
    .min(1)
    .max(20),
  note: z.string().trim().max(2000).nullish(),
});

/** PUT /api/curation/review — tahap 2: nilai 1..5 semua kriteria (milik penilai sendiri). */
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
    const res = await saveCurationReview(db, {
      hackathonId: hackathon.id,
      reviewer: auth.address,
      projectId: parsed.data.projectId,
      entries: parsed.data.entries,
      note: parsed.data.note || null,
    });
    await audit(db, {
      actor: auth.address,
      action: "curation.review",
      target: parsed.data.projectId,
      detail: { name: res.name, organization: res.organization, entries: parsed.data.entries },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return curationErrorResponse(e);
  }
}
