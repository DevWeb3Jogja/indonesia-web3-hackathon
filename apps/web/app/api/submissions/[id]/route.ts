import { clientIp } from "@iw3h/auth";
import { rateLimit } from "@iw3h/db";
import { type NextRequest, NextResponse } from "next/server";
import { getSubmission, toPublic, updateSubmission } from "@/lib/db";
import { db } from "@/lib/turso";
import type { SubmissionInput } from "@/lib/types";
import { hashEditCode, sanitizeInput, validateSubmission } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSubmission(params.id);
  if (!s) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ item: toPublic(s) });
}

interface PutBody extends SubmissionInput {
  editCode: string;
  authEmail: string;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const limit = await rateLimit(db, `edit-put:${clientIp(req)}:${params.id}`, 10, 300);
    if (!limit.ok) {
      return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });
    }

    const body = (await req.json()) as PutBody;
    const existing = await getSubmission(params.id);
    if (!existing) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const hash = hashEditCode(body.editCode ?? "", body.authEmail ?? "");
    if (hash !== existing.editCodeHash)
      return NextResponse.json({ error: "Edit code atau email salah" }, { status: 403 });

    const err = validateSubmission(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const clean = sanitizeInput(body);
    const ok = await updateSubmission({
      ...existing,
      ...clean,
      email: existing.email, // email auth tidak bisa diganti
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      editCodeHash: existing.editCodeHash,
    });
    if (!ok) return NextResponse.json({ error: "Gagal update" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal update submission" }, { status: 500 });
  }
}
