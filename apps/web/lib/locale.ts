/**
 * Helper locale murni, tanpa import JSON.
 * Dipisah dari i18n.ts supaya client component & middleware tidak ikut
 * membundel kedua kamus hanya untuk memakai localePath/splitPath.
 */

export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Bangun href yang sadar locale: localePath("en", "/prizes") -> "/en/prizes" */
export function localePath(locale: string, path = "/"): string {
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return path === "/" ? `/${l}` : `/${l}${path}`;
}

/** Pisahkan "/en/projects/abc" jadi { locale: "en", path: "/projects/abc" } */
export function splitPath(pathname: string): { locale: Locale; path: string } {
  const [, first = "", ...rest] = pathname.split("/");
  if (isLocale(first)) {
    return {
      locale: first,
      path: `/${rest.join("/")}`.replace(/\/$/, "") || "/",
    };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}
