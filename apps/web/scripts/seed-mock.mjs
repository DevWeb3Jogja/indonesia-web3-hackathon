// Seed .data/submissions.json dengan 10 project mock. `node scripts/seed-mock.mjs`
// Semua mock pakai edit code IDN-MOCK2026 + email masing-masing.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const EDIT_CODE = "IDN-MOCK2026";
const hash = (code, email) =>
  createHash("sha256")
    .update(`${code.trim().toUpperCase()}::${email.trim().toLowerCase()}`)
    .digest("hex");

const addr = (n) => `0x${n.toString(16).padStart(4, "0").repeat(10)}`;

const mermaid = `

## Arsitektur

\`\`\`mermaid
graph TD
  A[User Wallet] -->|sign tx| B(Frontend dApp)
  B --> C{Router Contract}
  C -->|swap| D[Liquidity Pool]
  C -->|stake| E[Vault]
  E --> F[(Yield Strategy)]
\`\`\`

## Tech Stack

| Layer | Tools |
|---|---|
| Contract | Solidity 0.8.24, Foundry |
| Frontend | Next.js 14, wagmi, viem |
| Indexer | The Graph |

## Roadmap

- [x] MVP di BSC Testnet
- [x] Audit internal
- [ ] Mainnet launch
- [ ] Mobile app
`;

const simpleDesc = `
Kami membangun produk ini karena melihat gap besar di pasar Indonesia. Onboarding
Web3 masih terlalu rumit untuk pengguna awam.

### Fitur Utama

1. **Gasless onboarding** — user pertama kali tidak perlu punya BNB
2. **Social recovery** — wallet bisa dipulihkan lewat guardian
3. **Local payment rails** — top up via QRIS

> Target: 10.000 wallet aktif dalam 6 bulan pertama.

Kode sepenuhnya open source, lisensi MIT.
`;

const raw = [
  {
    projectName: "WarungPay",
    teamName: "Tim Kelapa Muda",
    tagline: "Terima pembayaran crypto di warung, settle langsung ke rupiah.",
    tracks: ["finance-commerce"],
    network: "bsc",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=warungpay",
    demoUrl: "https://warungpay.demo.xyz",
  },
  {
    projectName: "Sawit Agent",
    teamName: "Nusantara Labs",
    tagline: "AI agent yang mengelola posisi yield farming otomatis 24/7.",
    tracks: ["ai-agents", "finance-commerce"],
    network: "bsc",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=sawit",
    demoUrl: "https://sawit-agent.vercel.app",
  },
  {
    projectName: "Gotong",
    teamName: "Rembug Kolektif",
    tagline: "Arisan on-chain dengan smart contract, transparan tanpa bendahara.",
    tracks: ["consumer-apps", "finance-commerce"],
    network: "opbnb",
    logoUrl: "",
    demoUrl: "",
  },
  {
    projectName: "Batik Chain",
    teamName: "Pendhapa",
    tagline: "Sertifikat keaslian batik tulis sebagai NFT, anti pemalsuan.",
    tracks: ["consumer-apps"],
    network: "opbnb",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=batik",
    demoUrl: "https://batikchain.id",
  },
  {
    projectName: "Ojol DAO",
    teamName: "Roda Dua",
    tagline: "Koperasi driver ojek online berbasis DAO, bagi hasil otomatis.",
    tracks: ["consumer-apps"],
    network: "bsc-testnet",
    logoUrl: "",
    demoUrl: "https://ojoldao.xyz",
  },
  {
    projectName: "Rendang Router",
    teamName: "Padang Builders",
    tagline: "DEX aggregator dengan slippage protection khusus token lokal.",
    tracks: ["finance-commerce"],
    network: "bsc",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=rendang",
    demoUrl: "https://rendang.finance",
  },
  {
    projectName: "Dukun Data",
    teamName: "Sixth Sense",
    tagline: "AI agent riset on-chain, tanya pakai bahasa Indonesia dapat insight.",
    tracks: ["ai-agents"],
    network: "bsc",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=dukun",
    demoUrl: "",
  },
  {
    projectName: "Kirim Aja",
    teamName: "Pos Digital",
    tagline: "Remitansi TKI ke kampung halaman, biaya 0.1% settle 3 detik.",
    tracks: ["finance-commerce", "consumer-apps"],
    network: "opbnb",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=kirim",
    demoUrl: "https://kirimaja.app",
  },
  {
    projectName: "Tani Pintar",
    teamName: "Sawah Digital",
    tagline: "Agent AI prediksi harga panen + escrow kontrak petani-tengkulak.",
    tracks: ["ai-agents", "finance-commerce", "consumer-apps"],
    network: "bsc-testnet",
    logoUrl: "",
    demoUrl: "https://tanipintar.dev",
  },
  {
    projectName: "Wayang Verse",
    teamName: "Layar Kelir",
    tagline: "Game kartu wayang on-chain, karakter jadi NFT yang bisa di-trade.",
    tracks: ["consumer-apps", "ai-agents"],
    network: "opbnb-testnet",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=wayang",
    demoUrl: "https://wayangverse.game",
  },
];

const roles = ["Fullstack", "Smart Contract", "Product", "Designer", "Data"];
const videos = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://youtu.be/jNQXAC9IVRw",
  "https://www.youtube.com/watch?v=9bZkp7q19f0",
];

const items = raw.map((r, i) => {
  const slug = r.projectName.toLowerCase().replace(/\W+/g, "");
  const email = `${slug}@example.com`;
  const created = new Date(2026, 6, 1 + i, 9 + i, 30).toISOString();
  return {
    id: slug.slice(0, 10),
    createdAt: created,
    updatedAt: created,
    projectName: r.projectName,
    tagline: r.tagline,
    teamName: r.teamName,
    tracks: r.tracks,
    contractAddress: addr(i + 1),
    network: r.network,
    problemStatement: `Di Indonesia, ${r.tagline.toLowerCase()} Masalahnya, solusi yang ada sekarang mahal, lambat, dan tidak transparan. Pengguna harus percaya pada perantara yang tidak punya akuntabilitas apa pun.`,
    solution: `${r.projectName} memindahkan seluruh alur ke smart contract di BNB Chain. Biaya turun drastis, settlement instan, dan setiap transaksi bisa diaudit siapa saja lewat block explorer.`,
    description: (i % 2 === 0 ? mermaid : simpleDesc).trim(),
    githubUrl: `https://github.com/mock-org/${slug}`,
    demoVideoUrl: videos[i % videos.length],
    demoUrl: r.demoUrl,
    teamMembers: Array.from({ length: (i % 3) + 2 }, (_, j) => ({
      name: `Anggota ${j + 1} ${r.teamName.split(" ")[0]}`,
      role: roles[(i + j) % roles.length],
      social: `https://x.com/${slug}${j + 1}`,
    })),
    extraLinks:
      i % 3 === 0
        ? []
        : [
            { label: "Docs", url: `https://docs.${slug}.xyz` },
            { label: "Twitter", url: `https://x.com/${slug}` },
          ],
    email,
    logoUrl: r.logoUrl,
    editCodeHash: hash(EDIT_CODE, email),
  };
});

const out = path.join(process.cwd(), ".data", "submissions.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(items, null, 2));
console.log(`${items.length} mock submissions -> ${out}`);
console.log(`Edit code: ${EDIT_CODE}  |  email: <slug>@example.com`);
