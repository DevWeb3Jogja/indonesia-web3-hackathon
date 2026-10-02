import { siteBase } from "./site";

/**
 * URL pitch deck → URL yang bisa di-iframe (judge/user lihat tanpa download).
 * null = provider tak dikenal / tak bisa di-embed → cukup link biasa.
 * Domain hasilnya HARUS ada di CSP frame-src (next.config.mjs).
 */
export function deckEmbedUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw, siteBase());
  } catch {
    return null;
  }
  const path = u.pathname;

  // Upload .pptx/.ppt/.pdf ke situs → viewer Office Online (file harus publik).
  if (/\.pptx?$/i.test(path)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(u.href)}`;
  }
  if (/\.pdf$/i.test(path)) return u.href;

  if (u.hostname === "docs.google.com") {
    const id = path.match(/^\/presentation\/d\/([\w-]+)/)?.[1];
    return id ? `https://docs.google.com/presentation/d/${id}/preview` : null;
  }
  if (u.hostname === "drive.google.com") {
    const id = path.match(/^\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get("id");
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  if (u.hostname.endsWith("canva.com")) {
    const m = path.match(/^\/design\/([\w-]+)\/([\w-]+)/);
    return m ? `https://www.canva.com/design/${m[1]}/${m[2]}/view?embed` : null;
  }
  return null;
}

/** Sama, tapi short-link canva.link di-resolve dulu (redirect → canva.com/design/…). */
export async function resolveDeckEmbed(raw: string): Promise<string | null> {
  if (!/^https?:\/\/canva\.link\//i.test(raw)) return deckEmbedUrl(raw);
  try {
    const res = await fetch(raw, {
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 86400 },
    });
    const loc = res.headers.get("location");
    return loc ? deckEmbedUrl(loc) : null;
  } catch {
    return null;
  }
}

/** URL unduh langsung deck; null = provider tak punya link unduh (mis. Canva). */
export function deckDownloadUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw, siteBase());
  } catch {
    return null;
  }
  if (/\.(pptx?|pdf|key)$/i.test(u.pathname)) return raw;
  if (u.hostname === "docs.google.com") {
    const id = u.pathname.match(/^\/presentation\/d\/([\w-]+)/)?.[1];
    return id ? `https://docs.google.com/presentation/d/${id}/export/pptx` : null;
  }
  if (u.hostname === "drive.google.com") {
    const id = u.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get("id");
    return id ? `https://drive.google.com/uc?export=download&id=${id}` : null;
  }
  return null;
}
