import { type NextRequest, NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/locale";
import { MAINTENANCE_HTML } from "@/lib/maintenance-page";

// Next 16: konvensi `middleware` diganti `proxy` (fungsi + nama file).
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Maintenance mode: set env MAINTENANCE_MODE=1 lalu restart container.
  // Semua navigasi halaman → halaman maintenance (503). Aset & /api tak kena
  // (dikecualikan matcher), tapi halaman self-contained jadi tetap tampil.
  if (process.env.MAINTENANCE_MODE === "1") {
    return new NextResponse(MAINTENANCE_HTML, {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": "600",
        "cache-control": "no-store",
      },
    });
  }

  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) {
    return NextResponse.next();
  }

  // Default EN; pilihan bahasa user disimpan di cookie dan menang di kunjungan berikutnya.
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  const locale = cookie && LOCALES.some((l) => l === cookie) ? cookie : DEFAULT_LOCALE;

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Lewati API, aset Next, dan file statis di /public
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
