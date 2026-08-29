import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/locale";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://indonesiaweb3hack.xyz";

// Halaman publik (profile/team dikecualikan — butuh wallet, noindex).
const PUBLIC_PATHS = ["", "/projects", "/prizes", "/schedule", "/faq", "/submit"];

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    }))
  );
}
