import { z } from "zod";
import { isClean } from "./filter";
import { NETWORKS, TRACKS } from "./types";

const CLEAN_MSG = "Mengandung kata yang tidak pantas";

const trackIds = TRACKS.map((t) => t.id) as [string, ...string[]];
const networkIds = NETWORKS.map((n) => n.id) as [string, ...string[]];
// WAJIB https:// — z.string().url() saja lolos javascript:/data: (stored XSS saat
// URL dirender sebagai href/src di halaman detail publik).
const optionalUrl = z
  .string()
  .url()
  .max(2048)
  .startsWith("https://", "Harus diawali https://")
  .nullish();

// Versi wajib (dipakai createProjectSchema) — tidak boleh kosong.
const requiredUrl = z.string().url().max(2048).startsWith("https://", "Harus diawali https://");

const isLogo = (v: string) =>
  /^https:\/\//.test(v) ||
  /^\/api\/uploads\//.test(v) || // hasil upload same-origin (R2 / fallback lokal)
  /^data:image\/(png|jpe?g|webp|gif);base64,/.test(v); // legacy: logo lama data URL
// Logo: URL https ATAU data URL gambar (hasil upload → resize di client).
const logoField = z
  .string()
  .max(300_000)
  .refine(isLogo, "Logo harus URL https atau file gambar")
  .nullish();
const requiredLogo = z
  .string()
  .min(1, "Logo wajib")
  .max(300_000)
  .refine(isLogo, "Logo harus URL https atau file gambar");

// Socials + pitch deck (opsional) → disimpan sebagai JSON di kolom extra_links.
// URL wajib https:// karena dirender jadi href di halaman detail publik (cegah XSS).
// ponytail: form yang memiliki extra_links (X/LinkedIn/Pitch), jadi rebuild saat
// edit aman — tak ada penulis lain (dicek: 0 project punya extra_links).
const extraLinksField = z
  .array(
    z.object({
      label: z.string().trim().min(1).max(40),
      url: z.string().url().max(2048).startsWith("https://", "Harus diawali https://"),
    })
  )
  .max(10)
  .nullish()
  .transform((v) => (v?.length ? JSON.stringify(v) : null));

/** Field project — dipakai create & update. Dipakai server (zod) dan client. */
export const projectFields = z.object({
  name: z.string().trim().min(2).max(80).refine(isClean, CLEAN_MSG),
  tagline: z.string().trim().max(140).refine(isClean, CLEAN_MSG).nullish(),
  tracks: z.array(z.enum(trackIds)).min(1).max(TRACKS.length),
  contractAddress: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Alamat kontrak tidak valid")
    .nullish(),
  network: z.enum(networkIds).nullish(),
  problemStatement: z.string().trim().max(2000).refine(isClean, CLEAN_MSG).nullish(),
  solution: z.string().trim().max(2000).refine(isClean, CLEAN_MSG).nullish(),
  description: z.string().max(20000).refine(isClean, CLEAN_MSG).nullish(),
  githubUrl: optionalUrl,
  demoUrl: optionalUrl,
  demoVideoUrl: optionalUrl,
  logoUrl: logoField,
  extraLinks: extraLinksField,
});

// Create (submission baru): logo, website (demoUrl) & demo video WAJIB. Edit tetap
// pakai projectFields (opsional) supaya submitter lama tak terkunci saat mengedit.
export const createProjectSchema = projectFields.extend({
  mode: z.enum(["solo", "team"]),
  logoUrl: requiredLogo,
  demoUrl: requiredUrl,
  demoVideoUrl: requiredUrl,
});

export type ProjectFieldsInput = z.infer<typeof projectFields>;

/** Pisahkan tracks dari field kolom untuk disimpan ke tabel projects. */
export function splitFields(data: ProjectFieldsInput) {
  const { tracks, ...fields } = data;
  return { tracks, fields };
}
