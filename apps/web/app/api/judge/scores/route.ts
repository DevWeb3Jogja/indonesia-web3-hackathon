import { clientIp } from "@iw3h/auth";
import { canScore, getCurrentHackathon, getProjectById, rateLimit, upsertScores } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().min(1),
  entries: z
    .array(
      z.object({
        criterionId: z.string().min(1),
        score: z.number().int().min(1).max(10),
        comment: z.string().max(1000).nullish(),
      })
    )
    .min(1)
    .max(20),
});

export async function PUT(req: Request) {
  const auth = await requireAuth("judge", "admin");
  if (auth instanceof Response) return auth;

  const limit = await rateLimit(db, `judge:${clientIp(req)}`, 60, 300);
  if (!limit.ok) return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon || !canScore(hackathon)) {
    return NextResponse.json({ error: "Penjurian sedang ditutup" }, { status: 409 });
  }

  const project = await getProjectById(db, parsed.data.projectId);
  if (!project || project.status !== "submitted" || project.hackathonId !== hackathon.id) {
    return NextResponse.json({ error: "Project tidak valid" }, { status: 404 });
  }

  await upsertScores(db, parsed.data.projectId, auth.address, parsed.data.entries);
  return NextResponse.json({ ok: true });
}
