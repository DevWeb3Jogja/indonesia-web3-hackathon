import { clientIp } from "@iw3h/auth";
import { isContract } from "@iw3h/auth/chains";
import { rateLimit } from "@iw3h/db";
import { type NextRequest, NextResponse } from "next/server";
import { createSubmission, listSubmissions, toPublic } from "@/lib/db";
import { db } from "@/lib/turso";
import type { StoredSubmission, SubmissionInput } from "@/lib/types";
import { hashEditCode, newEditCode, newId, sanitizeInput, validateSubmission } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = await listSubmissions();
    const items = all.map(toPublic).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal memuat submissions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const limit = await rateLimit(db, `submit:${clientIp(req)}`, 5, 300);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan, tunggu beberapa menit" },
        {
          status: 429,
        }
      );
    }

    const body = (await req.json()) as SubmissionInput;
    const err = validateSubmission(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const clean = sanitizeInput(body);

    // Saring submission asal-asalan: alamat harus benar-benar kontrak di network yang dipilih.
    const deployed = await isContract(clean.network, clean.contractAddress as `0x${string}`).catch(
      () => null
    );
    if (deployed === false) {
      return NextResponse.json(
        { error: "Alamat kontrak tidak ditemukan di network yang dipilih (tidak ada bytecode)" },
        { status: 400 }
      );
    }
    // deployed === null berarti RPC lagi bermasalah — jangan blokir peserta karena itu.
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
