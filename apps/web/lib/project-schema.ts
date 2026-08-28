import { z } from "zod";
import { NETWORKS, TRACKS } from "./types";

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

/** Field project — dipakai create & update. Dipakai server (zod) dan client. */
export const projectFields = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(140).nullish(),
  tracks: z.array(z.enum(trackIds)).min(1).max(TRACKS.length),
  contractAddress: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Alamat kontrak tidak valid")
    .nullish(),
  network: z.enum(networkIds).nullish(),
  problemStatement: z.string().trim().max(2000).nullish(),
  solution: z.string().trim().max(2000).nullish(),
  description: z.string().max(20000).nullish(),
  githubUrl: optionalUrl,
  demoUrl: optionalUrl,
  demoVideoUrl: optionalUrl,
  logoUrl: optionalUrl,
});

export const createProjectSchema = projectFields.extend({
  mode: z.enum(["solo", "team"]),
});

export type ProjectFieldsInput = z.infer<typeof projectFields>;

/** Pisahkan tracks dari field kolom untuk disimpan ke tabel projects. */
export function splitFields(data: ProjectFieldsInput) {
  const { tracks, ...fields } = data;
  return { tracks, fields };
}
