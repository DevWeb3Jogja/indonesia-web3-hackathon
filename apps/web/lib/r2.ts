import { AwsClient } from "aws4fetch";

/**
 * Upload gambar ke Cloudflare R2 (S3-compatible) dari server. File tidak lewat DB
 * (cuma URL yang disimpan) → detail project tetap ringan. Kredensial server-only.
 */
interface R2Env {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase: string;
}

function r2Env(): R2Env | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_BASE?.replace(/\/$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

export function r2Configured(): boolean {
  return r2Env() !== null;
}

/** Origin publik R2 (untuk allowlist CSP img-src di UI, kalau perlu). */
export function r2PublicOrigin(): string | null {
  const base = process.env.R2_PUBLIC_BASE;
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

function r2Client(env: R2Env): AwsClient {
  return new AwsClient({
    accessKeyId: env.accessKeyId,
    secretAccessKey: env.secretAccessKey,
    region: "auto",
    service: "s3",
  });
}

const s3Url = (env: R2Env, key: string) =>
  `https://${env.accountId}.r2.cloudflarestorage.com/${env.bucket}/${key}`;

/**
 * PUT objek ke R2 → kembalikan PATH proxy same-origin (`/api/uploads/r2/<key>`),
 * BUKAN URL r2.dev. Gambar disajikan lewat domain kita sendiri (cert yang sama
 * dengan situs) → tak kena masalah SSL/clock di sisi klien & tak kena rate-limit
 * dev-URL r2.dev.
 */
export async function uploadToR2(
  key: string,
  body: ArrayBuffer,
  contentType: string
): Promise<string> {
  const env = r2Env();
  if (!env) throw new Error("R2 not configured");
  const res = await r2Client(env).fetch(s3Url(env, key), {
    method: "PUT",
    body,
    headers: { "content-type": contentType },
  });
  if (!res.ok) {
    throw new Error(`R2 upload ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return `/api/uploads/r2/${key}`;
}

/** GET objek dari R2 (signed) untuk di-proxy ke klien. null kalau tak dikonfigurasi. */
export async function getFromR2(key: string): Promise<Response | null> {
  const env = r2Env();
  if (!env) return null;
  return r2Client(env).fetch(s3Url(env, key), { method: "GET" });
}
