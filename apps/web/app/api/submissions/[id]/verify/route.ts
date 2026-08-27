import { clientIp } from "@iw3h/auth";
import { rateLimit } from "@iw3h/db";
import { type NextRequest, NextResponse } from "next/server";
import { getSubmission } from "@/lib/db";
import { db } from "@/lib/turso";
import { hashEditCode } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Verifikasi edit code + email; kalau valid, kirim data lengkap untuk form edit */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Cek editCode+email = gerbang brute-force — batasi per IP+submission.
    const limit = await rateLimit(db, `edit-verify:${clientIp(req)}:${params.id}`, 10, 300);
    if (!limit.ok) {
      return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });
    }

    const { editCode, email } = (await req.json()) as {
      editCode: string;
      email: string;
    };
    const s = await getSubmission(params.id);
    if (!s) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const hash = hashEditCode(editCode ?? "", email ?? "");
    if (hash !== s.editCodeHash)
      return NextResponse.json({ error: "Edit code atau email salah" }, { status: 403 });

    const { editCodeHash, ...full } = s;
    return NextResponse.json({ item: full });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal verifikasi" }, { status: 500 });
  }
}
