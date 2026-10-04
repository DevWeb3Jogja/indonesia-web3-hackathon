import { audit, CURATION_ORGS, getCurrentHackathon, setReviewerOrg } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({ organization: z.enum(CURATION_ORGS) });

/** PUT /api/curation/reviewer — penilai memilih organisasinya (wallet dari session). */
export async function PUT(req: Request) {
  const auth = await requireAuth("admin", "panitia");
  if (auth instanceof Response) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid organization" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return NextResponse.json({ error: "No hackathon" }, { status: 404 });

  await setReviewerOrg(db, hackathon.id, auth.address, parsed.data.organization);
  await audit(db, {
    actor: auth.address,
    action: "curation.reviewer",
    target: auth.address,
    detail: { organization: parsed.data.organization },
  });
  return NextResponse.json({ ok: true, organization: parsed.data.organization });
}
