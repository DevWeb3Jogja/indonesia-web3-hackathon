import { canRegister, canSubmitProject, getCurrentHackathon } from "@iw3h/db";
import { cache } from "react";
import { db } from "./turso";

/**
 * Status fase untuk UI server (tombol/teks ikut fase & deadline DB, bukan teks statis).
 * Enforcement tetap di API — ini cuma tampilan. DB gagal → anggap tutup: tombol
 * "lihat project" tak pernah salah, tombol "submit" yang mati yang menyesatkan.
 */
export const getPhase = cache(async () => {
  const hackathon = await getCurrentHackathon(db).catch(() => null);
  return {
    hackathon,
    submissionOpen: !!hackathon && canSubmitProject(hackathon),
    registrationOpen: !!hackathon && canRegister(hackathon),
  };
});
