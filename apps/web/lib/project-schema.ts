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

// Video demo HARUS host video yang bisa ditonton — bukan link web project.
// YouTube/Vimeo/Google Drive/Loom, atau file video langsung (.mp4/.webm/.mov).
export const isVideoUrl = (v: string) =>
  /^https:\/\/([a-z0-9-]+\.)*(youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com|loom\.com)\//i.test(
    v
  ) || /^https:\/\/\S+\.(mp4|webm|mov|m4v)(\?\S*)?$/i.test(v);
const VIDEO_MSG = "Harus link video (YouTube, Vimeo, Google Drive, atau Loom)";
const optionalVideoUrl = optionalUrl.refine((v) => v == null || isVideoUrl(v), VIDEO_MSG);
const requiredVideoUrl = requiredUrl.refine(isVideoUrl, VIDEO_MSG);

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
  demoVideoUrl: optionalVideoUrl,
  logoUrl: logoField,
  extraLinks: extraLinksField,
});

// Create (submission baru): logo, demo video & pitch deck WAJIB (website opsional).
// Edit tetap pakai projectFields (opsional) supaya submitter lama tak terkunci.
export const createProjectSchema = projectFields
  .extend({
    mode: z.enum(["solo", "team"]),
    logoUrl: requiredLogo,
    demoVideoUrl: requiredVideoUrl,
  })
  .superRefine((data, ctx) => {
    // Pitch deck wajib untuk submission baru. Disimpan di extra_links (JSON), jadi
    // dicek di sini setelah transform (array → string).
    let hasPitch = false;
    try {
      const links = data.extraLinks ? (JSON.parse(data.extraLinks) as { label?: string }[]) : [];
      hasPitch = Array.isArray(links) && links.some((l) => l.label === "Pitch Deck");
    } catch {
      hasPitch = false;
    }
    if (!hasPitch) {
      ctx.addIssue({ code: "custom", path: ["pitchDeck"], message: "Pitch deck wajib" });
    }
  });

export type ProjectFieldsInput = z.infer<typeof projectFields>;

/** Pisahkan tracks dari field kolom untuk disimpan ke tabel projects. */
export function splitFields(data: ProjectFieldsInput) {
  const { tracks, ...fields } = data;
  return { tracks, fields };
}
