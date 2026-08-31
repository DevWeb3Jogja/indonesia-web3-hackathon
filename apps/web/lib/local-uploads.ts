import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";

/**
 * Fallback penyimpanan gambar di disk VPS ketika R2 gagal/limit. Butuh volume
 * PERSISTEN (LOCAL_UPLOADS_DIR, mis. /data/uploads) supaya file tak hilang saat
 * redeploy. Disajikan lewat route /api/uploads/f/<key>.
 */
export function localUploadsDir(): string | null {
  return process.env.LOCAL_UPLOADS_DIR?.trim() || null;
}

/** Simpan bytes ke disk lokal → kembalikan URL app, atau null kalau tak dikonfigurasi. */
export async function saveLocalUpload(key: string, body: ArrayBuffer): Promise<string | null> {
  const dir = localUploadsDir();
  if (!dir) return null;
  const path = safeJoin(dir, key);
  if (!path) return null;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(body));
  return `/api/uploads/f/${key}`;
}

/** Baca file lokal untuk disajikan; null kalau tak ada / path tidak aman. */
export async function readLocalUpload(key: string): Promise<Buffer | null> {
  const dir = localUploadsDir();
  if (!dir) return null;
  const path = safeJoin(dir, key);
  if (!path) return null;
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

/** Cegah path-traversal: hasil normalize harus tetap di dalam `dir`. */
function safeJoin(dir: string, key: string): string | null {
  const base = normalize(dir);
  const path = normalize(join(base, key));
  return path === base || path.startsWith(base + sep) ? path : null;
}
