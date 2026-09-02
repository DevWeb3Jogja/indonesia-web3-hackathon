/**
 * Resize gambar di klien → Blob webp, lalu upload ke R2 (fallback disk VPS).
 * Dipakai logo project (cover, kotak) & gambar deskripsi (contain, sisi terpanjang).
 */

type Fit = "cover" | "contain";

/**
 * Resize `file` ke webp.
 * - "cover": crop tengah ke kotak `size`×`size` (logo).
 * - "contain": muat dalam kotak `size` tanpa upscale, jaga aspek (gambar inline).
 */
export function resizeToWebp(file: File, size: number, fit: Fit, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error("no canvas"));
      }
      if (fit === "cover") {
        canvas.width = size;
        canvas.height = size;
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      } else {
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
      }
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load fail"));
    };
    img.src = url;
  });
}

/** Upload webp Blob → URL same-origin (R2 / fallback disk). Throw kalau gagal. */
export async function uploadImage(blob: Blob): Promise<string> {
  const res = await fetch("/api/uploads/image", {
    method: "POST",
    headers: { "content-type": "image/webp" },
    body: blob,
  });
  if (!res.ok) throw new Error(String(res.status));
  const { url } = (await res.json()) as { url: string };
  return url;
}
