import type { Metadata } from "next";

/** Metadata OG/Twitter per-halaman: pakai gambar branded di /og/<slug>.png.
 *  Di-spread ke return generateMetadata halaman; merge dengan openGraph layout. */
export function ogMeta(slug: string, title: string): Metadata {
  const url = `/og/${slug}.png`;
  return {
    openGraph: { title, images: [{ url, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, images: [url] },
  };
}
