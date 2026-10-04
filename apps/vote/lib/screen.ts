import { DEMO_HACKATHON_ID, getCurrentHackathon, type VoteScreen, voteScreen } from "@iw3h/db";
import QRCode from "qrcode";
import { db } from "@/lib/turso";

/** URL publik situs vote. SENGAJA dari env (bukan header request): di balik proxy
 *  host bisa 0.0.0.0/internal, dan QR yang salah di videotron = 300 orang nyasar. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://vote.indonesiaweb3hack.xyz"
).replace(/\/+$/, "");

/** URL yang dituju QR. Demo (gladi) → halaman vote mode demo. */
export const voteTarget = (demo: boolean) => (demo ? `${SITE_URL}/?demo=1` : SITE_URL);

/** Teks URL besar di layar: tanpa skema, supaya pendek & gampang diketik manual. */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//, "");

/** Data layar besar untuk edisi live atau demo. Tak ada edisi aktif → waiting kosong. */
export async function loadScreen(demo: boolean): Promise<VoteScreen> {
  if (demo) return voteScreen(db, DEMO_HACKATHON_ID);
  const hackathon = await getCurrentHackathon(db);
  if (!hackathon) return { state: "waiting", total: 0, finalists: [] };
  return voteScreen(db, hackathon.id);
}

/** QR sebagai data-URI SVG (render server, tajam di ukuran berapa pun). Hitam di atas
 *  putih + quiet zone 4 modul (standar) supaya kamera HP di barisan belakang tetap
 *  bisa membaca dari videotron. Level M: cukup tahan silau/moiré layar LED. */
export async function qrDataUri(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    color: { dark: "#0c0c0cff", light: "#ffffffff" },
  });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
