import {
  audit,
  getCurrentHackathon,
  isFrozen,
  PRESENTATION_MAX,
  setPresentationOrder,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { judgingErrorResponse } from "@/lib/judging";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  projectIds: z.array(z.string().min(1).max(100)).min(1).max(PRESENTATION_MAX),
});

/** PUT /api/admin/judging/order — ADMIN mengatur urutan presentasi finalis demo day.
 *  Mengganti seluruh urutan: wajib memuat SEMUA finalis saat ini tepat sekali. Form juri
 *  & rekap mengikuti urutan ini. */
export async function PUT(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "No hackathon" }, { status: 404 });
  // Selaras nilai panitia: setelah completed, semua data penjurian beku.
  if (isFrozen(hackathon)) {
    return NextResponse.json({ error: "Hackathon sudah selesai — urutan beku" }, { status: 409 });
  }

  try {
    const res = await setPresentationOrder(db, {
      hackathonId: hackathon.id,
      projectIds: parsed.data.projectIds,
      actor: auth.address,
    });
    await audit(db, {
      actor: auth.address,
      action: "judging.order",
      target: hackathon.id,
      detail: { order: res.order.map((p, i) => `${i + 1}. ${p.name}`) },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return judgingErrorResponse(e);
  }
}
