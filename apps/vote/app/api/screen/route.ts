import { NextResponse } from "next/server";
import { loadScreen } from "@/lib/screen";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/screen — data layar besar (videotron). PUBLIK untuk edisi live: hanya
 *  total suara + daftar finalis; TIDAK PERNAH angka per project (hasil diumumkan di
 *  panggung). ?demo=1 → edisi demo (gladi), tetap KHUSUS ADMIN. Edisi demo di-seed
 *  oleh halaman /screen, bukan di sini — endpoint ini dipanggil tiap 2 detik, jadi
 *  harus baca-saja. */
export async function GET(req: Request) {
  const demo = new URL(req.url).searchParams.get("demo") === "1";
  if (demo) {
    const auth = await requireAuth("admin");
    if (auth instanceof Response) return auth;
  }
  return NextResponse.json(await loadScreen(demo), {
    headers: { "cache-control": "no-store" },
  });
}
