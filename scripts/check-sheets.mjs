// Verifikasi koneksi Google Sheets sebelum dipakai peserta.
// Jalankan: node scripts/check-sheets.mjs
//
// Menguji berurutan: env var lengkap -> format private key -> autentikasi ->
// akses dokumen -> IZIN TULIS (bikin tab sementara lalu hapus lagi).
// Uji tulis itu penting: Sheet yang di-share sebagai Viewer lolos semua tes
// baca, lalu baru gagal saat peserta pertama menekan submit.

import fs from "fs";
import path from "path";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const OK = "[32m✓[0m";
const NO = "[31m✗[0m";
const bold = (s) => `[1m${s}[0m`;
const dim = (s) => `[2m${s}[0m`;

/** Baca .env.local / .env tanpa dependency. Variabel shell tetap menang. */
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"') && v.length > 1) ||
        (v.startsWith("'") && v.endsWith("'") && v.length > 1)
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  }
}

function fail(msg, hint) {
  console.log(`${NO} ${msg}`);
  if (hint) console.log(dim(`   ${hint}`));
  process.exit(1);
}

loadEnv();
console.log(bold("\nCek koneksi Google Sheets\n"));

// --- 1. env var lengkap ---
const missing = [
  "GOOGLE_SHEET_ID",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
].filter((k) => !process.env[k]);

if (missing.length) {
  fail(
    `Env var belum lengkap: ${missing.join(", ")}`,
    "Ketiganya wajib ada. Kalau salah satu kosong, aplikasi diam-diam memakai\n   .data/submissions.json — dan itu tidak jalan di Vercel."
  );
}
console.log(`${OK} Ketiga env var terisi`);

// --- 2. bentuk private key ---
const rawKey = process.env.GOOGLE_PRIVATE_KEY;
const key = rawKey.replace(/\\n/g, "\n"); // sama persis dengan lib/db.ts
if (!key.includes("BEGIN PRIVATE KEY")) {
  fail(
    "GOOGLE_PRIVATE_KEY tidak berisi penanda BEGIN PRIVATE KEY",
    'Salin nilai field "private_key" dari file JSON service account, apa adanya.'
  );
}
if (!key.trimEnd().endsWith("-----END PRIVATE KEY-----")) {
  fail(
    "GOOGLE_PRIVATE_KEY terpotong di ujung",
    "Pastikan seluruh key ikut tersalin sampai -----END PRIVATE KEY-----"
  );
}
if (!key.includes("\n")) {
  fail(
    "GOOGLE_PRIVATE_KEY tidak punya newline sama sekali",
    "Di .env.local tulis satu baris dengan \\n literal, dibungkus tanda kutip ganda."
  );
}
console.log(
  `${OK} Format private key wajar ${dim(
    `(${key.split("\n").length} baris${rawKey.includes("\\n") ? ", pakai \\n literal" : ", newline asli"})`
  )}`
);

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
if (!email.endsWith(".iam.gserviceaccount.com")) {
  console.log(
    `${NO} Email service account terlihat tidak biasa: ${email}`
  );
  console.log(dim("   Biasanya berakhiran .iam.gserviceaccount.com"));
} else {
  console.log(`${OK} Email service account: ${dim(email)}`);
}

// --- 3. autentikasi + akses dokumen ---
const auth = new JWT({
  email,
  key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);

try {
  await doc.loadInfo();
} catch (e) {
  const msg = String(e?.message ?? e);
  if (msg.includes("403") || /permission/i.test(msg)) {
    fail(
      "Ditolak (403): service account belum punya akses ke Sheet ini",
      `Buka Sheet > Share > tambahkan ${email} sebagai Editor.`
    );
  }
  if (msg.includes("404")) {
    fail(
      "Sheet tidak ditemukan (404): GOOGLE_SHEET_ID salah",
      "Ambil ID dari URL: docs.google.com/spreadsheets/d/<INI_ID>/edit"
    );
  }
  if (/invalid_grant|DECODER|PEM/i.test(msg)) {
    fail(
      `Autentikasi gagal: ${msg}`,
      "Hampir selalu masalah format GOOGLE_PRIVATE_KEY, atau jam sistem meleset jauh."
    );
  }
  if (/API has not been used|SERVICE_DISABLED|accessNotConfigured/i.test(msg)) {
    fail(
      "Google Sheets API belum diaktifkan di project ini",
      "Cloud Console > APIs & Services > Library > Google Sheets API > Enable."
    );
  }
  if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|fetch failed/i.test(msg)) {
    fail(
      "Tidak bisa menjangkau googleapis.com",
      "Masalah jaringan, bukan konfigurasi. Cek koneksi internet, proxy, atau firewall."
    );
  }
  fail(`Gagal membuka Sheet: ${msg}`);
}
console.log(`${OK} Terhubung ke Sheet: ${bold(doc.title)}`);

// --- 4. tab submissions ---
const sheet = doc.sheetsByTitle["submissions"];
if (sheet) {
  let headerInfo = "header belum diisi";
  try {
    await sheet.loadHeaderRow();
    headerInfo = `${sheet.headerValues.length} kolom, ${sheet.rowCount - 1} baris data`;
  } catch {}
  console.log(`${OK} Tab "submissions" sudah ada ${dim(`(${headerInfo})`)}`);
} else {
  console.log(
    `${OK} Tab "submissions" belum ada ${dim("(normal — dibuat otomatis saat submission pertama)")}`
  );
}

// --- 5. izin TULIS (paling menentukan) ---
const probeTitle = `__cek_tulis_${Date.now()}`;
let probe;
try {
  probe = await doc.addSheet({ title: probeTitle });
} catch (e) {
  const msg = String(e?.message ?? e);
  fail(
    "Tidak bisa menulis ke Sheet — kemungkinan besar di-share sebagai Viewer",
    `Buka Sheet > Share > ubah ${email} jadi ${bold("Editor")}.\n   Pesan asli: ${msg.slice(0, 160)}`
  );
} finally {
  if (probe) {
    try {
      await probe.delete();
    } catch {
      console.log(
        dim(`   catatan: tab sementara "${probeTitle}" gagal dihapus, hapus manual.`)
      );
    }
  }
}
console.log(`${OK} Izin tulis OK ${dim("(tab uji dibuat lalu dihapus lagi)")}`);

console.log(bold("\nSemua lolos. Submission akan tersimpan ke Google Sheet.\n"));
