/**
 * Utilitas paginasi bersama untuk list "data banyak" (users, projects, audit).
 * Mendukung DUA mode dalam satu request:
 *  - page/offset  → untuk UI "loncat ke halaman N" (butuh total & totalPages)
 *  - cursor/keyset → untuk infinite-scroll & skala besar (tak kena biaya OFFSET)
 * Plus search (q), filter, dan sort ditentukan tiap list function.
 */

export interface PageParams {
  page?: number;
  limit?: number;
  cursor?: string | null; // keyset; kalau ada, meniadakan offset
  q?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;

export function normPage(page?: number): number {
  return Math.max(1, Math.trunc(page ?? 1));
}

export function normLimit(limit?: number, fallback = DEFAULT_LIMIT): number {
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit ?? fallback)));
}

/** Encode nilai keyset (nilai kolom sort + id tiebreak) jadi cursor opaque. */
export function encodeCursor(parts: (string | number)[]): string {
  return Buffer.from(JSON.stringify(parts)).toString("base64url");
}

/** Decode cursor; kembali null kalau kosong/rusak (fail-safe → jatuh ke page 1). */
export function decodeCursor(cursor?: string | null): (string | number)[] | null {
  if (!cursor) return null;
  try {
    const v = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Rakit hasil paginasi dari rows yang di-fetch limit+1 (untuk deteksi hasMore).
 * `keyOf` menghasilkan komponen cursor dari baris terakhir yang ditahan.
 */
export function buildPage<T>(
  rows: T[],
  opts: { page: number; limit: number; total: number },
  keyOf: (last: T) => (string | number)[]
): Paged<T> {
  const hasMore = rows.length > opts.limit;
  const items = hasMore ? rows.slice(0, opts.limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(keyOf(last)) : null;
  return {
    items,
    meta: {
      page: opts.page,
      limit: opts.limit,
      total: opts.total,
      totalPages: Math.max(1, Math.ceil(opts.total / opts.limit)),
      nextCursor,
      hasMore,
    },
  };
}
