import {
  audit,
  CONTACT_STATUSES,
  canCurate,
  FINALIST_SLOTS,
  getCurrentHackathon,
  setFinalist,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { curationErrorResponse } from "@/lib/curation";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().min(1).max(100),
  slot: z.enum(FINALIST_SLOTS).nullable(), // null = keluarkan dari shortlist
  contactStatus: z.enum(CONTACT_STATUSES).optional(),
  note: z.string().trim().max(1000).nullish(),
});

/** PUT /api/curation/finalists — ADMIN saja: shortlist + status kontak tim. */
export async function PUT(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon || !canCurate(hackathon)) {
    return NextResponse.json({ error: "Kurasi belum/tidak dibuka" }, { status: 409 });
  }

  try {
    const res = await setFinalist(db, {
      hackathonId: hackathon.id,
      actor: auth.address,
      projectId: parsed.data.projectId,
      slot: parsed.data.slot,
      contactStatus: parsed.data.contactStatus,
      // undefined = jangan ubah catatan; "" = kosongkan.
      note: parsed.data.note === undefined ? undefined : parsed.data.note || null,
    });
    await audit(db, {
      actor: auth.address,
      action: parsed.data.slot ? "finalist.set" : "finalist.clear",
      target: parsed.data.projectId,
      detail: { ...res, contactStatus: parsed.data.contactStatus ?? null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return curationErrorResponse(e);
  }
}
