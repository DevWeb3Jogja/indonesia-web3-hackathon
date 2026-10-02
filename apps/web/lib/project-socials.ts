/**
 * Socials + pitch deck per project. SATU sumber label agar sisi tulis (form) dan
 * sisi baca (edit) tak pernah drift — kalau berbeda, URL hilang saat edit.
 * Disimpan sebagai {label,url} di kolom `extra_links`, dirender jadi link chip.
 */
/** Label pitch deck — dipakai juga untuk mencari deck di sisi baca (lib/deck-embed). */
export const PITCH_DECK_LABEL = "Pitch Deck";

export const PROJECT_SOCIALS = [
  { field: "xUrl", label: "X" },
  { field: "linkedinUrl", label: "LinkedIn" },
  { field: "pitchDeckUrl", label: PITCH_DECK_LABEL },
] as const;

export type ProjectSocialField = (typeof PROJECT_SOCIALS)[number]["field"];
