import { type NextRequest, NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/locale";

/** Ambil locale dari header Accept-Language, jatuh ke default kalau tak cocok. */
function preferredLocale(req: NextRequest): string {
  const header = req.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    const base = tag.split("-")[0];
    const hit = LOCALES.find((l) => l === tag || l === base);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) {
    return NextResponse.next();
  }

  // Kunjungan pertama pakai bahasa browser; setelahnya cookie yang menang.
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  const locale = cookie && LOCALES.some((l) => l === cookie) ? cookie : preferredLocale(req);

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Lewati API, aset Next, dan file statis di /public
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
