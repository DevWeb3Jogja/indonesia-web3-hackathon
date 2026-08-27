/**
 * Semua media eksternal dikumpulkan di sini biar gampang di-swap.
 * ponytail: hotlink CDN pihak ketiga, ganti ke /public kalau link-nya dicabut.
 */
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P";
const proxy = (file: string) =>
  `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(
    `${CDN}/${file}`
  )}&w=1280&q=85`;

export const ASSETS = {
  // Sengaja tanpa poster: poster lama (/hero-poster.jpg) berasal dari desain
  // sebelumnya dan sempat berkedip di belakang hero sebelum frame pertama video
  // termuat. Latar warna solid di elemen video-nya sudah cukup.
  heroVideo: `${CDN}/hf_20260511_151648_2bdfbd1c-6bde-4f5d-a967-f57cbced97f6.mp4`,
  submissionsVideo: `${CDN}/hf_20260514_154120_b89bfedd-530d-4ebb-9eb7-42eeafe08667.mp4`,
  statPrize: proxy("hf_20260514_154203_6c6f94dc-a07e-4ba5-8688-106f01ccd2c8.png"),
  statBuilders: proxy("hf_20260514_154151_45c62c60-3bcc-4f21-8f9d-03722ebb5df8.png"),
  statSessions: proxy("hf_20260514_152238_24ec8db4-d728-4739-bb30-e985533e9637.png"),
  // Satu-satunya aset lokal yang tersisa. Aslinya emas; digeser ke teal lewat
  // CSS filter saat dipakai, supaya tidak menabrak palet.
  nusantara: "/nusantara-polos.png",
} as const;
