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

/** PUT objek ke R2 (server-to-server, tanpa CORS) → kembalikan URL publiknya. */
export async function uploadToR2(
  key: string,
  body: ArrayBuffer,
  contentType: string
): Promise<string> {
  const env = r2Env();
  if (!env) throw new Error("R2 not configured");

  const client = new AwsClient({
    accessKeyId: env.accessKeyId,
    secretAccessKey: env.secretAccessKey,
    region: "auto",
    service: "s3",
  });

  const endpoint = `https://${env.accountId}.r2.cloudflarestorage.com/${env.bucket}/${key}`;
  const res = await client.fetch(endpoint, {
    method: "PUT",
    body,
    headers: { "content-type": contentType },
  });
  if (!res.ok) {
    throw new Error(`R2 upload ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return `${env.publicBase}/${key}`;
}
