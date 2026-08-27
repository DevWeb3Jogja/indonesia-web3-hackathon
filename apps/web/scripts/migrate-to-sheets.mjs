// Pindahkan isi .data/submissions.json ke Google Sheet.
// Jalankan: npm run migrate:sheets
//
// Aman diulang: id yang sudah ada di Sheet dilewati, jadi tidak pernah dobel.
// editCodeHash ikut dipindah, supaya edit code peserta tetap berlaku.
//
// Pemetaan kolom di bawah SENGAJA mencerminkan submissionToRow() di lib/db.ts.
// Kalau HEADERS di sana berubah, sesuaikan juga di sini.

import fs from "node:fs";
import path from "node:path";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";

const OK = "[32m✓[0m";
const NO = "[31m✗[0m";
const bold = (s) => `[1m${s}[0m`;
const dim = (s) => `[2m${s}[0m`;

const HEADERS = [
  "id",
  "createdAt",
  "updatedAt",
  "projectName",
  "tagline",
  "teamName",
  "tracks",
  "contractAddress",
  "network",
  "problemStatement",
  "solution",
  "description",
  "githubUrl",
  "demoVideoUrl",
  "demoUrl",
  "teamMembers",
  "extraLinks",
  "email",
  "logoUrl",
  "editCodeHash",
];
const SHEET_TITLE = "submissions";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  }
}

function die(msg, hint) {
  console.log(`${NO} ${msg}`);
  if (hint) console.log(dim(`   ${hint}`));
  process.exit(1);
}

/** Cerminan submissionToRow() di lib/db.ts */
function toRow(s) {
  return {
    id: s.id,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    projectName: s.projectName,
    tagline: s.tagline,
    teamName: s.teamName,
    tracks: JSON.stringify(s.tracks ?? []),
    contractAddress: s.contractAddress,
    network: s.network,
    problemStatement: s.problemStatement,
    solution: s.solution,
    description: s.description,
    githubUrl: s.githubUrl,
    demoVideoUrl: s.demoVideoUrl,
    demoUrl: s.demoUrl,
    teamMembers: JSON.stringify(s.teamMembers ?? []),
    extraLinks: JSON.stringify(s.extraLinks ?? []),
    email: s.email,
    logoUrl: s.logoUrl,
    editCodeHash: s.editCodeHash ?? "",
  };
}

loadEnv();
console.log(bold("\nMigrasi .data/submissions.json ke Google Sheet\n"));

for (const k of ["GOOGLE_SHEET_ID", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"]) {
  if (!process.env[k]) die(`Env var ${k} kosong`, "Jalankan dulu: npm run check:sheets");
}

const LOCAL = path.join(process.cwd(), ".data", "submissions.json");
if (!fs.existsSync(LOCAL)) die(`Tidak ada ${LOCAL}`, "Tidak ada yang perlu dimigrasi.");

let items;
try {
  items = JSON.parse(fs.readFileSync(LOCAL, "utf8"));
} catch (e) {
  die(`File JSON lokal rusak: ${e.message}`);
}
if (!Array.isArray(items) || items.length === 0)
  die("File lokal kosong, tidak ada yang dimigrasi.");
console.log(`${OK} Terbaca ${bold(items.length)} submission dari file lokal`);

const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
await doc.loadInfo();
console.log(`${OK} Terhubung ke Sheet: ${bold(doc.title)}`);

let sheet = doc.sheetsByTitle[SHEET_TITLE];
if (!sheet) {
  sheet = await doc.addSheet({ title: SHEET_TITLE, headerValues: HEADERS });
  console.log(`${OK} Tab "${SHEET_TITLE}" dibuat dengan ${HEADERS.length} kolom`);
} else {
  try {
    await sheet.loadHeaderRow();
    if (!sheet.headerValues?.length) await sheet.setHeaderRow(HEADERS);
  } catch {
    await sheet.setHeaderRow(HEADERS);
  }
  console.log(`${OK} Tab "${SHEET_TITLE}" sudah ada`);
}

const existing = new Set((await sheet.getRows()).map((r) => r.get("id")).filter(Boolean));
if (existing.size) console.log(dim(`   ${existing.size} baris sudah ada di Sheet, akan dilewati`));

const baru = items.filter((s) => !existing.has(s.id));
const dilewati = items.length - baru.length;

if (baru.length === 0) {
  console.log(`${OK} Semua sudah ada di Sheet, tidak ada yang ditambahkan`);
} else {
  await sheet.addRows(baru.map(toRow));
  console.log(`${OK} ${bold(baru.length)} baris ditulis ke Sheet`);
}
if (dilewati) console.log(dim(`   ${dilewati} dilewati karena id-nya sudah ada`));

// Baca ulang sebagai bukti, bukan asumsi
const after = await sheet.getRows();
const ids = new Set(after.map((r) => r.get("id")));
const hilang = items.filter((s) => !ids.has(s.id)).map((s) => s.id);
if (hilang.length) die(`Ada yang tidak sampai ke Sheet: ${hilang.join(", ")}`);
console.log(`${OK} Diverifikasi: ${bold(after.length)} baris ada di Sheet`);

console.log(bold("\nSelesai. Berikutnya: backup lalu hapus file lokal, dan restart dev server.\n"));
