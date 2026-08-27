import { NextRequest, NextResponse } from "next/server";
import { createSubmission, listSubmissions, toPublic } from "@/lib/db";
import { hashEditCode, newEditCode, newId, sanitizeInput, validateSubmission } from "@/lib/utils";
import type { StoredSubmission, SubmissionInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = await listSubmissions();
    const items = all
      .map(toPublic)
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal memuat submissions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubmissionInput;
    const err = validateSubmission(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const clean = sanitizeInput(body);
    const now = new Date().toISOString();
    const id = newId();
    const editCode = newEditCode();

    const stored: StoredSubmission = {
      ...clean,
      id,
      createdAt: now,
      updatedAt: now,
      editCodeHash: hashEditCode(editCode, clean.email),
    };

    await createSubmission(stored);
    // editCode dikirim SEKALI saja, tidak pernah disimpan plaintext
    return NextResponse.json({ id, editCode }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal menyimpan submission" }, { status: 500 });
  }
}
