import path from "node:path";

// CSP: connect-src masih https:/wss: menyeluruh karena WalletConnect/RPC memakai banyak
// endpoint — persempit ke daftar domain final setelah daftar RPC produksi terkunci.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.reown.com",
  "img-src * data: blob:",
  // Video hero & submissions di-hotlink dari CDN (lihat lib/assets.ts). Tanpa
  // media-src, <video> jatuh ke default-src 'self' dan diblokir.
  "media-src 'self' https: blob:",
  "connect-src 'self' https: wss:",
  // Wallet (Reown/WalletConnect) + embed video demo project (YouTube).
  "frame-src https://challenges.cloudflare.com https://verify.walletconnect.com https://verify.walletconnect.org https://secure.walletconnect.com https://secure.reown.com https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Best-practice: jangan bocorkan stack (X-Powered-By) + emit source map produksi
  // (Lighthouse "valid source maps" & debugging error produksi).
  poweredByHeader: false,
  productionBrowserSourceMaps: true,
  transpilePackages: ["@iw3h/db", "@iw3h/auth"],
  // Docker (Coolify): output minimal + trace dari root monorepo.
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // Type-check dijalankan terpisah (tsc). Lewati di `next build` supaya build
  // Docker lebih ringan/cepat & tidak OOM saat VPS ramai. (Next 16 sudah tak
  // menjalankan ESLint saat build, jadi tak perlu opsi eslint.)
  typescript: { ignoreBuildErrors: true },
  // Next 16: pindah dari experimental.serverComponentsExternalPackages.
  // libsql punya native binding — jangan dibundel.
  serverExternalPackages: ["@libsql/client", "libsql"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Next 16 default Turbopack, tapi kita pakai --webpack (script) karena config
  // webpack di bawah menangani stub @x402/* + externals libsql yang Turbopack
  // belum tangani mulus. Migrasi ke Turbopack = follow-up (dev jauh lebih cepat).
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@libsql/client", "libsql");
    }
    // @x402/* = optional peer deps @coinbase/cdp-sdk (payment, tidak dipakai).
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core": false,
      "@x402/core/client": false,
      "@x402/evm": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/extensions": false,
      "@x402/svm": false,
    };
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { message: /Critical dependency: the request of a dependency is an expression/ },
      { message: /Can't resolve '@react-native-async-storage\/async-storage'/ },
      { message: /Can't resolve 'pino-pretty'/ },
    ];
    return config;
  },
};

export default nextConfig;
