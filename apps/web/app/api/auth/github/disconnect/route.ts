import { getCurrentHackathon, getProjectForUser, rateLimit, unlinkGithub } from "@iw3h/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function POST() {
  const authed = await requireAuth();
  if (authed instanceof Response) return authed;
  const limit = await rateLimit(db, `gh-disc:${authed.address}`, 10);
  if (!limit.ok) return NextResponse.json({ error: "Terlalu sering" }, { status: 429 });

  // GitHub = identitas terverifikasi untuk project yang sudah disubmit. Selama masih
  // punya project (solo atau via tim), tak boleh dilepas — kalau tidak, syarat GitHub
  // bisa dielakkan: connect → submit → disconnect, project tetap ada tanpa GitHub.
  const hackathon = await getCurrentHackathon(db);
  if (hackathon && (await getProjectForUser(db, hackathon.id, authed.address))) {
    return NextResponse.json(
      {
        error:
          "Masih punya project di edisi ini — GitHub tak bisa dilepas. Hapus/keluar project dulu.",
        code: "has_project",
      },
      { status: 409 }
    );
  }

  await unlinkGithub(db, authed.address);
  return NextResponse.json({ ok: true });
}
