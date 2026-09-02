import { getFromR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * Proxy gambar R2 lewat origin kita sendiri (cert situs yang sama) → hindari
 * masalah SSL/clock klien & rate-limit r2.dev. Objek publik, di-cache lama
 * (key acak & immutable). Path di-batasi (anti traversal).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const path = key.join("/");
  if (path.includes("..") || !/^[a-zA-Z0-9._/-]+$/.test(path)) {
    return new Response("Bad key", { status: 400 });
  }

  const res = await getFromR2(path);
  if (!res?.ok || !res.body) return new Response("Not found", { status: 404 });

  return new Response(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
