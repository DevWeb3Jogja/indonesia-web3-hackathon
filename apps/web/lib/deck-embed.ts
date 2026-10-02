import { siteBase } from "./site";

const FILE_EXT = /\.(pptx?|pdf|key)$/i;

/** Pecah URL deck jadi bentuk yang dikenali; null = provider tak dikenal. */
function parseDeck(raw: string) {
  let u: URL;
  try {
    u = new URL(raw, siteBase());
  } catch {
    return null;
  }
  const p = u.pathname;
  const ext = p.match(FILE_EXT)?.[1]?.toLowerCase();
  if (ext) return { kind: "file", url: u.href, ext } as const;
  if (u.hostname === "docs.google.com") {
    const id = p.match(/^\/presentation\/d\/([\w-]+)/)?.[1];
    return id ? ({ kind: "slides", id } as const) : null;
  }
  if (u.hostname === "drive.google.com") {
    const id = p.match(/^\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get("id");
    return id ? ({ kind: "drive", id } as const) : null;
  }
  if (u.hostname === "canva.com" || u.hostname.endsWith(".canva.com")) {
    const m = p.match(/^\/design\/([\w-]+)\/([\w-]+)/);
    return m ? ({ kind: "canva", design: m[1], token: m[2] } as const) : null;
  }
  return null;
}

/**
 * URL deck → URL yang bisa di-iframe (judge/user lihat tanpa download).
 * null = tak bisa di-embed → cukup link biasa.
 * Domain hasilnya HARUS ada di CSP frame-src (next.config.mjs).
 */
export function deckEmbedUrl(raw: string): string | null {
  const d = parseDeck(raw);
  switch (d?.kind) {
    case "file":
      if (d.ext === "pdf") return d.url;
      if (d.ext === "key") return null; // Keynote: tak ada viewer web publik.
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(d.url)}`;
    case "slides":
      return `https://docs.google.com/presentation/d/${d.id}/preview`;
    case "drive":
      return `https://drive.google.com/file/d/${d.id}/preview`;
    case "canva":
      return `https://www.canva.com/design/${d.design}/${d.token}/view?embed`;
    default:
      return null;
  }
}

/** URL unduh langsung; null = provider tak punya link unduh (mis. Canva). */
export function deckDownloadUrl(raw: string): string | null {
  const d = parseDeck(raw);
  switch (d?.kind) {
    case "file":
      return d.url;
    case "slides":
      return `https://docs.google.com/presentation/d/${d.id}/export/pptx`;
    case "drive":
      return `https://drive.google.com/uc?export=download&id=${d.id}`;
    default:
      return null;
  }
}

/** Seperti deckEmbedUrl, tapi short-link canva.link di-resolve dulu (302 → canva.com/design/…). */
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
