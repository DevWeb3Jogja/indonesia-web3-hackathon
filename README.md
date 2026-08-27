# Indonesia Web3 Hackathon 2026 — Submission Platform

Website submission untuk Indonesia Web3 Hackathon (#WhereBuildersBuild). Full Next.js (frontend + backend), database Google Sheets.

## Fitur fiturnya

- Landing page, Prizes, Schedule, FAQ, Projects gallery
- Submit project: nama tim/project, track (checklist), contract address (auto-link ke BscScan sesuai network), problem statement, solution, project detail (markdown + diagram mermaid, ada tab Write/Preview), GitHub repo, video demo (YouTube auto-embed), info tim + sosmed, link tambahan (docs, sosmed project, dll)
- Edit submission real-time pakai **edit code + email** (kode di-hash SHA-256, tidak pernah disimpan plaintext)
- Tanpa credentials Google, otomatis pakai file lokal `.data/submissions.json` (enak buat development)

## Jalankan Lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Tanpa setup apa pun, data tersimpan di `.data/submissions.json`.

## Setup Google Sheets (5 menit, untuk production)

1. **Buat Google Sheet baru** di [sheets.new](https://sheets.new). Salin ID dari URL: `https://docs.google.com/spreadsheets/d/`**`INI_SHEET_ID`**`/edit`
2. **Buat Service Account:**
   - Buka [console.cloud.google.com](https://console.cloud.google.com), buat project baru (gratis)
   - Menu **APIs & Services > Library** → cari **Google Sheets API** → **Enable**
   - Menu **APIs & Services > Credentials** → **Create Credentials > Service Account** → beri nama, klik **Done**
   - Klik service account yang baru dibuat → tab **Keys** → **Add Key > Create new key > JSON** → file JSON terunduh
3. **Share Sheet ke Service Account:**
   - Buka file JSON, salin nilai `client_email` (bentuknya `xxx@yyy.iam.gserviceaccount.com`)
   - Di Google Sheet, klik **Share**, paste email itu, kasih akses **Editor**
4. **Isi environment variables** (salin `.env.example` jadi `.env.local`):

```env
GOOGLE_SHEET_ID=isi_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@yyy.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"
```

`GOOGLE_PRIVATE_KEY` diambil dari field `private_key` di file JSON (biarkan `\n` apa adanya, bungkus dengan tanda kutip).

Header kolom dibuat otomatis saat submission pertama masuk (tab `submissions`).

> **Wajib diisi sebelum peserta masuk.** Fallback file lokal `.data/submissions.json`
> hanya untuk development. Filesystem Vercel read-only, jadi kalau deploy tanpa tiga
> env var di atas, setiap `POST /api/submissions` gagal dengan `500` dan **tidak ada
> submission yang tersimpan**.

### 5. Verifikasi sebelum dipakai

```bash
npm run check:sheets
```

Menguji berurutan: env var lengkap → format private key → autentikasi → akses dokumen →
**izin tulis**. Uji tulis dilakukan dengan membuat tab sementara lalu menghapusnya lagi.
Itu penting: Sheet yang ter-share sebagai **Viewer** lolos semua tes baca dan baru gagal
saat peserta pertama menekan submit.

Tiap kegagalan menyebut penyebab dan cara perbaikannya. Jalankan juga setelah mengisi env
var di Vercel — tarik dulu nilainya ke lokal dengan `vercel env pull .env.local`.

## Ekspor CSV untuk penjurian

`GET /api/submissions/export` mengembalikan CSV berisi seluruh submission, siap dibuka
di Excel atau Google Sheets (sudah ber-BOM UTF-8, jadi huruf beraksen tidak rusak).

Ekspor ini memuat **email kontak tim**, jadi endpoint-nya berproteksi token. Set env var:

```env
EXPORT_TOKEN=   # bikin dengan: openssl rand -hex 32
```

Tanpa `EXPORT_TOKEN`, endpoint mati (gagal tertutup, bukan terbuka).

```bash
# cara aman: token di header
curl -H "Authorization: Bearer $EXPORT_TOKEN" \
  https://situsmu.vercel.app/api/submissions/export -o submissions.csv

# cara praktis: token di query, bisa langsung diklik di browser
# (hindari kalau bisa — token ikut tercatat di log akses dan riwayat browser)
https://situsmu.vercel.app/api/submissions/export?token=ISI_TOKEN
```

Kolom: `id`, `createdAt`, `updatedAt`, `projectName`, `tagline`, `teamName`, `tracks`,
`network`, `contractAddress`, `contractExplorerUrl`, `githubUrl`, `demoVideoUrl`,
`demoUrl`, `problemStatement`, `solution`, `description`, `teamSize`, `teamMembers`,
`extraLinks`, `email`, `logoUrl`. Kolom `editCodeHash` sengaja tidak ikut diekspor.

## Deploy ke Vercel

```bash
npx vercel
```

Tambahkan 3 env vars di atas lewat **Vercel Dashboard > Project > Settings > Environment Variables**, lalu redeploy. Selesai.

## Struktur

```
app/
  page.tsx              Landing
  submit/               Form submission + layar sukses (edit code)
  projects/             Gallery + filter track + search
  projects/[id]/        Detail (markdown, mermaid, YouTube embed)
  projects/[id]/edit/   Verifikasi edit code lalu form edit
  prizes|schedule|faq/  Halaman info
  api/submissions/      REST API (GET, POST, PUT, verify)
components/             Navbar, form, markdown editor/renderer, dll
lib/                    db (Sheets + fallback lokal), types, validasi
```

## Catatan Keamanan

- Edit code hanya ditampilkan sekali setelah submit, disimpan sebagai hash
- Email kontak tim tidak pernah dikirim ke client di endpoint publik
- Semua input divalidasi dan disanitasi di server
