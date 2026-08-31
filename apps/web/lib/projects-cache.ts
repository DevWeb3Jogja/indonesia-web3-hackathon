/**
 * Cache TTL untuk galeri project publik.
 *
 * DB Turso ada di aws-us-east-1, VPS di Indonesia → tiap query ~250ms lintas
 * samudra, dan galeri = beberapa query. Galeri publik tak perlu real-time, jadi
 * hasilnya di-cache singkat. Container VPS = SATU proses Node berumur panjang, jadi
 * module cache ini dibagi semua request (bukan per-user) tanpa perlu CDN/Redis.
 * Invalidasi eksplisit saat project dibuat/diedit/dihapus supaya tetap fresh.
 *
 * ponytail: in-memory single-instance. Kalau nanti multi-instance/replika, pindah
 * ke Redis atau Turso embedded replica (yang juga menghapus latensi lintas samudra).
 */
const TTL_MS = 60_000;

const cache = new Map<string, { at: number; data: unknown }>();

/** Ambil dari cache kalau masih segar; kalau tidak, hitung, simpan, kembalikan. */
export async function cachedProjectsList<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;
  const data = await compute();
  cache.set(key, { at: Date.now(), data });
  return data;
}

/** Buang seluruh cache galeri (panggil setelah project berubah). */
export function invalidateProjectsList(): void {
  cache.clear();
}
