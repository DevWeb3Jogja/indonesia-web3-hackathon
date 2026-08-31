import { randomBytes } from "node:crypto";
import { rateLimit } from "@iw3h/db";
import { NextResponse } from "next/server";
import { r2Configured, uploadToR2 } from "@/lib/r2";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const MAX_BYTES = 3_000_000; // 3MB — klien sudah resize; ini backstop
const EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/** POST body = bytes gambar (Content-Type image/*) → upload ke R2, balas { url }. */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!r2Configured()) {
    return NextResponse.json({ error: "Upload belum dikonfigurasi" }, { status: 503 });
  }

  const limit = await rateLimit(db, `upload:${auth.address}`, 40, 300);
  if (!limit.ok) return NextResponse.json({ error: "Terlalu banyak upload" }, { status: 429 });

  const contentType = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = EXT[contentType];
  if (!ext) return NextResponse.json({ error: "Format gambar tidak didukung" }, { status: 400 });

  const buf = await req.arrayBuffer();
  if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Ukuran gambar tidak valid" }, { status: 400 });
  }

  const key = `desc/${auth.address.toLowerCase()}/${randomBytes(12).toString("hex")}.${ext}`;
  try {
    const url = await uploadToR2(key, buf, contentType);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[POST /api/uploads/image] R2 gagal:", e);
    return NextResponse.json({ error: "Upload gagal, coba lagi" }, { status: 502 });
  }
}
