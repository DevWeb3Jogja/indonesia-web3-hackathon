import { notFound } from "next/navigation";

/**
 * not-found.tsx hanya menangani notFound() yang dilempar dari dalam segment,
 * bukan URL yang tidak cocok route mana pun — itu jatuh ke 404 bawaan Next di
 * luar shell. Catch-all ini menariknya kembali ke dalam layout locale.
 * Route spesifik (/prizes, /projects/[id], ...) tetap menang atas catch-all.
 */
export default function CatchAll(): never {
  notFound();
}
