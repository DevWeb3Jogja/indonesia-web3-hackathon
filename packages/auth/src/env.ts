import { z } from "zod";

/**
 * Validasi env server saat pertama dipakai — deploy yang kurang variabel
 * gagal dengan pesan jelas, bukan error 500 misterius di runtime.
 */
const schema = z.object({
  TURSO_DATABASE_URL: z.string().min(1, "TURSO_DATABASE_URL wajib diisi"),
  TURSO_AUTH_TOKEN: z.string().optional(), // opsional untuk file: lokal
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET minimal 32 karakter (openssl rand -base64 32)"),
});

let cached: z.infer<typeof schema> | null = null;

export function serverEnv() {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
