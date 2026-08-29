/**
 * Filter konten submission (judul/tagline/deskripsi/nama tim/username).
 * Baris pertahanan pertama, bukan satu-satunya: word-list menahan kasus biasa
 * (makian, slur), penulis nekat tetap bisa lolos — makanya ada disqualify di
 * backoffice. Sengaja longgar: lebih baik meloloskan borderline untuk ditinjau
 * manusia daripada menolak yang tak berbahaya.
 * Diadaptasi dari opm-char/app/src/lib/chat/filter.ts.
 */

/** Teks seperti yang dilihat matcher: lowercase, aksen dibuang, leetspeak
 *  dinormalkan, tanda baca → spasi, huruf berulang dipangkas ("anjiiing"). */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/9/g, "g")
    .replace(/[^a-z\s]+/g, " ")
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kata yang ditolak, dicocokkan utuh (whole-word) — beberapa adalah substring
 *  kata biasa ("assist", "class"), jadi substring match akan salah tolak. */
const BLOCKED = [
  // Makian & hinaan (Indonesia)
  "anjing",
  "anjg",
  "anjay",
  "asu",
  "bajingan",
  "bangsat",
  "bacot",
  "bego",
  "brengsek",
  "goblok",
  "jancok",
  "jancuk",
  "kampret",
  "keparat",
  "kontol",
  "kntl",
  "memek",
  "pepek",
  "puki",
  "pukimak",
  "kimak",
  "jembut",
  "ngentot",
  "ngentod",
  "tolol",
  "sialan",
  "lonte",
  "pelacur",
  "kunyuk",
  // Rasial / SARA
  "cokin",
  "kafir",
  "nigger",
  "nigga",
  "chink",
  "faggot",
  "tranny",
  "retard",
  "retarded",
  // Makian (Inggris)
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "bastard",
  "asshole",
  "cunt",
  "cock",
  "pussy",
  "whore",
  "slut",
  // Menyuruh mati
  "kys",
  "kill yourself",
] as const;

/** Kata terlarang pertama di dalam teks, atau null kalau bersih. */
export function offence(text: string): string | null {
  const padded = ` ${normalize(text)} `;
  for (const word of BLOCKED) {
    if (padded.includes(` ${word} `)) return word;
  }
  return null;
}

/** Nama yang mengklaim otoritas situs — ditolak untuk username/nama tim. */
const RESERVED = [
  "admin",
  "administrator",
  "moderator",
  "mod",
  "staff",
  "official",
  "owner",
  "support",
  "system",
  "iw3h",
] as const;

/** Apakah nama mengaku sebagai pihak resmi. */
export function impersonates(name: string): boolean {
  const words = new Set(normalize(name).split(" "));
  return RESERVED.some((word) => words.has(word));
}

/** Boleh dipublish apa adanya (tak ada kata terlarang). */
export const isClean = (text: string): boolean => offence(text) === null;
