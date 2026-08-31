import type { NextRequest } from "next/server";

/**
 * Origin publik situs — untuk redirect_uri OAuth & redirect balik ke app.
 *
 * PENTING: di dalam container (di belakang reverse-proxy host), `req.url` host =
 * alamat bind internal (mis. 0.0.0.0:3000), BUKAN domain publik. Jangan pakai itu
 * untuk redirect_uri (GitHub menolak karena tak cocok) atau redirect balik (browser
 * diarahkan ke 0.0.0.0). Sumber andal: NEXT_PUBLIC_SITE_URL (di-set di env runtime),
 * fallback ke forwarded header, terakhir domain prod.
 */
export function siteBase(req?: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  if (req) {
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    if (host && !/^(0\.0\.0\.0|127\.|localhost)/.test(host)) return `${proto}://${host}`;
  }
  return "https://indonesiaweb3hack.xyz";
}
