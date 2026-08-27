import { createHash } from "crypto";
import { customAlphabet } from "nanoid";
import type { SubmissionInput } from "./types";
import { TRACKS, NETWORKS } from "./types";

const idGen = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);
const codeGen = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export const newId = () => idGen();
export const newEditCode = () => `IDN-${codeGen()}`;

export function hashEditCode(code: string, email: string): string {
  return createHash("sha256")
    .update(`${code.trim().toUpperCase()}::${email.trim().toLowerCase()}`)
    .digest("hex");
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isValidUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidAddress(v: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

export function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return m ? m[1] : null;
}

/** Validate + normalize submission payload. Returns error string or null. */
export function validateSubmission(b: Partial<SubmissionInput>): string | null {
  if (!b.projectName?.trim()) return "Nama project wajib diisi";
  if (!b.teamName?.trim()) return "Nama tim wajib diisi";
  if (!b.email || !isValidEmail(b.email)) return "Email kontak tidak valid";
  if (!Array.isArray(b.tracks) || b.tracks.length === 0)
    return "Pilih minimal satu track";
  const validTracks = TRACKS.map((t) => t.id) as string[];
  if (b.tracks.some((t) => !validTracks.includes(t)))
    return "Track tidak dikenal";
  if (!b.contractAddress || !isValidAddress(b.contractAddress))
    return "Contract address tidak valid (format 0x...)";
  if (!b.network || !NETWORKS.some((n) => n.id === b.network))
    return "Network tidak valid";
  if (!b.problemStatement?.trim()) return "Problem statement wajib diisi";
  if (!b.solution?.trim()) return "Solution wajib diisi";
  if (!b.description?.trim()) return "Project detail wajib diisi";
  if (!b.githubUrl || !isValidUrl(b.githubUrl))
    return "Link GitHub repo tidak valid";
  if (!b.demoVideoUrl || !isValidUrl(b.demoVideoUrl))
    return "Link video demo tidak valid";
  if (b.demoUrl && !isValidUrl(b.demoUrl)) return "Link live demo tidak valid";
  if (b.logoUrl && !isValidUrl(b.logoUrl)) return "Link logo tidak valid";
  if (!Array.isArray(b.teamMembers) || b.teamMembers.length === 0)
    return "Minimal satu anggota tim";
  if (b.teamMembers.some((m) => !m.name?.trim()))
    return "Nama anggota tim wajib diisi";
  if (
    Array.isArray(b.extraLinks) &&
    b.extraLinks.some((l) => l.url && !isValidUrl(l.url))
  )
    return "Ada link tambahan yang tidak valid";
  return null;
}

export function sanitizeInput(b: SubmissionInput): SubmissionInput {
  return {
    projectName: b.projectName.trim().slice(0, 120),
    tagline: (b.tagline ?? "").trim().slice(0, 200),
    teamName: b.teamName.trim().slice(0, 120),
    tracks: b.tracks,
    contractAddress: b.contractAddress.trim(),
    network: b.network,
    problemStatement: b.problemStatement.trim().slice(0, 3000),
    solution: b.solution.trim().slice(0, 5000),
    description: b.description.trim().slice(0, 30000),
    githubUrl: b.githubUrl.trim(),
    demoVideoUrl: b.demoVideoUrl.trim(),
    demoUrl: (b.demoUrl ?? "").trim(),
    teamMembers: (b.teamMembers ?? [])
      .filter((m) => m.name?.trim())
      .slice(0, 10)
      .map((m) => ({
        name: m.name.trim().slice(0, 80),
        role: (m.role ?? "").trim().slice(0, 80),
        social: (m.social ?? "").trim().slice(0, 200),
      })),
    extraLinks: (b.extraLinks ?? [])
      .filter((l) => l.url?.trim())
      .slice(0, 8)
      .map((l) => ({
        label: (l.label ?? "Link").trim().slice(0, 40),
        url: l.url.trim().slice(0, 300),
      })),
    email: b.email.trim().toLowerCase(),
    logoUrl: (b.logoUrl ?? "").trim(),
  };
}
