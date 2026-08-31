import { readLocalUpload } from "@/lib/local-uploads";

export const dynamic = "force-dynamic";

const CT: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

/** Sajikan gambar fallback yang tersimpan di disk VPS (LOCAL_UPLOADS_DIR). Publik. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const rel = key.join("/");
  const buf = await readLocalUpload(rel);
  if (!buf) return new Response("Not found", { status: 404 });

  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": CT[ext] ?? "application/octet-stream",
      // key acak & immutable → boleh di-cache lama.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
