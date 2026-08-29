"use client";

import { usePathname } from "next/navigation";
import { splitPath } from "@/lib/locale";

/** Sembunyikan nav/footer di rute fokus (mis. /submit) — halaman submission
 *  full-page tanpa chrome. usePathname sudah benar saat SSR, jadi tak ada flash. */
const HIDDEN = new Set(["/submit"]);

export default function HideChrome({ children }: { children: React.ReactNode }) {
  const { path } = splitPath(usePathname());
  if (HIDDEN.has(path)) return null;
  return <>{children}</>;
}
