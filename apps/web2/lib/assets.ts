/**
 * Media situs. Semua di-self-host di /public/media (dulu hotlink CDN pihak
 * ketiga) — di-compress: video 4K/1440p → 1600w/720 H.264 (20MB → ~1.3MB),
 * stat image → webp. Menghilangkan dependensi eksternal + LCP jauh lebih cepat.
 */
export const ASSETS = {
  heroVideo: "/media/hero.mp4",
  heroPoster: "/media/hero-poster.webp",
  submissionsVideo: "/media/submissions.mp4",
  statPrize: "/media/statPrize.webp",
  statBuilders: "/media/statBuilders.webp",
  statSessions: "/media/statSessions.webp",
  // Aslinya emas; digeser ke teal lewat CSS filter saat dipakai.
  nusantara: "/nusantara.png",
} as const;
