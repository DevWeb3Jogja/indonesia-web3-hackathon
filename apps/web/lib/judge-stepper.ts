/**
 * Logika murni form juri "satu project sekali tampil" (JudgePanel). Dipisah dari
 * komponen supaya bisa diuji tanpa DOM.
 */

/** Jarak horizontal minimum (px) agar geseran dianggap swipe, bukan tap/goyang jari. */
export const SWIPE_MIN_PX = 60;
/** Geseran harus jelas mendatar: |dx| ≥ RATIO × |dy| — scroll vertikal tak memicu pindah. */
export const SWIPE_RATIO = 1.5;

/** Arah swipe: +1 = project berikutnya (geser ke kiri), -1 = sebelumnya (ke kanan), 0 = bukan swipe. */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < SWIPE_RATIO * Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/** Index tujuan setelah melangkah `delta`; null kalau keluar batas (tak berputar). */
export function stepIndex(current: number, delta: number, length: number): number | null {
  const next = current + delta;
  return next >= 0 && next < length ? next : null;
}

/** Index awal dari ?p=<projectId>; tak dikenal/kosong → project pertama. */
export function indexOfProject(ids: string[], projectId: string | null): number {
  if (!projectId) return 0;
  const i = ids.indexOf(projectId);
  return i === -1 ? 0 : i;
}

/** Semua kriteria juri sudah bernilai 1..5. */
export function fullyScored(criteriaIds: string[], vals: Record<string, number> | undefined) {
  return criteriaIds.length > 0 && criteriaIds.every((id) => (vals?.[id] ?? 0) >= 1);
}

export interface Draft {
  vals: Record<string, number>;
  teamNote: string;
  internalNote: string;
}

/** Ada perubahan yang belum disimpan (catatan dibandingkan setelah trim, seperti saat simpan). */
export function isDirty(saved: Draft, draft: Draft, criteriaIds: string[]): boolean {
  return (
    criteriaIds.some((id) => (saved.vals[id] ?? 0) !== (draft.vals[id] ?? 0)) ||
    saved.teamNote.trim() !== draft.teamNote.trim() ||
    saved.internalNote.trim() !== draft.internalNote.trim()
  );
}
