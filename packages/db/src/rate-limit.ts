import { sql } from "drizzle-orm";
import type { Db } from "./client";

/**
 * Fixed-window rate limit di atas Turso — cukup untuk skala hackathon
 * (satu UPSERT per request tulis), tanpa layanan tambahan.
 * ponytail: window kasar (reset di batas menit); ganti @upstash/ratelimit
 * kalau butuh sliding window / trafik jauh lebih besar.
 */
export async function rateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds = 60,
  now = Date.now()
): Promise<{ ok: boolean; remaining: number }> {
  const windowStart = Math.floor(now / 1000 / windowSeconds);
  const rows = await db.run(sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN window_start = ${windowStart} THEN count + 1 ELSE 1 END,
      window_start = ${windowStart}
    RETURNING count
  `);
  const count = Number(rows.rows[0]?.count ?? 1);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}
