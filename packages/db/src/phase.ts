/**
 * Guard fase hackathon. Semua aturan "boleh/tidak" hidup di sini dan
 * WAJIB dipanggil di server sebelum menulis — UI hanya menyembunyikan tombol.
 * Status adalah tuas utama (diubah admin); deadline eksplisit (kalau diisi)
 * mengunci lebih keras daripada status.
 */

export type HackathonPhase = "draft" | "registration" | "submission" | "judging" | "completed";

export interface PhaseInfo {
  status: string;
  registrationClosesAt?: string | null;
  submissionClosesAt?: string | null;
  judgingClosesAt?: string | null;
}

function beforeDeadline(deadline: string | null | undefined, now: Date): boolean {
  if (!deadline) return true;
  let raw = deadline.trim().replace(" ", "T");
  if (raw.length === 10) raw += "T23:59:59"; // date-only → akhir hari
  if (!/[zZ]|[+-]\d\d:?\d\d$/.test(raw)) raw += "Z"; // tanpa timezone → anggap UTC
  const t = new Date(raw).getTime();
  // Deadline tak valid → jangan diam-diam mengunci fase; status yang menentukan.
  if (Number.isNaN(t)) return true;
  return now.getTime() < t;
}

export function canRegister(h: PhaseInfo, now = new Date()): boolean {
  return (
    (h.status === "registration" || h.status === "submission") &&
    beforeDeadline(h.registrationClosesAt, now)
  );
}

export function canSubmitProject(h: PhaseInfo, now = new Date()): boolean {
  return h.status === "submission" && beforeDeadline(h.submissionClosesAt, now);
}

/** Bentuk/ubah tim boleh selama registrasi maupun submission (sampai deadline submit). */
export function canManageTeam(h: PhaseInfo, now = new Date()): boolean {
  if (h.status === "registration") return beforeDeadline(h.registrationClosesAt, now);
  if (h.status === "submission") return beforeDeadline(h.submissionClosesAt, now);
  return false;
}

export function canScore(h: PhaseInfo, now = new Date()): boolean {
  return h.status === "judging" && beforeDeadline(h.judgingClosesAt, now);
}

/** Setelah completed, scores & winners beku permanen. */
export function isFrozen(h: PhaseInfo): boolean {
  return h.status === "completed";
}
