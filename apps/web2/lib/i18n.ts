import en from "@/locales/en.json";
import id from "@/locales/id.json";
import type { Locale } from "./locale";

export * from "./locale";

export type Dict = typeof id;

/**
 * Anotasi Record<Locale, Dict> ini pengaman utamanya: kalau en.json kehilangan
 * satu key atau bentuknya beda dari id.json, `npm run build` gagal.
 * ponytail: pengecekan terjemahan gratis dari TypeScript, tanpa tooling i18n.
 */
const DICTS: Record<Locale, Dict> = { id, en };

export function getDict(locale: string): Dict {
  return (DICTS as Record<string, Dict>)[locale] ?? DICTS.id;
}
