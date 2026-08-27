// CSP: connect-src masih https:/wss: menyeluruh karena WalletConnect/RPC memakai banyak
// endpoint — persempit ke daftar domain final setelah daftar RPC produksi terkunci.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://db.onlinewebfonts.com",
  "font-src 'self' data: https://fonts.gstatic.com https://db.onlinewebfonts.com",
  "img-src * data: blob:",
  "connect-src 'self' https: wss:",
  "frame-src https://verify.walletconnect.com https://verify.walletconnect.org https://secure.walletconnect.com https://secure.reown.com",
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
  transpilePackages: ["@iw3h/db", "@iw3h/auth"],
  experimental: {
    // Native binding — jangan dibundel webpack, require di runtime.
    serverComponentsExternalPackages: ["@libsql/client", "libsql"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Belt & braces di atas serverComponentsExternalPackages: libsql punya
      // binding native yang tidak boleh dibundel.
      config.externals.push("@libsql/client", "libsql");
    }
    // @x402/* = optional peer deps @coinbase/cdp-sdk (fitur payment, tidak dipakai).
    // Tanpa alias ini webpack gagal resolve saat bundling connector coinbase bawaan wagmi.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core": false,
      "@x402/evm": false,
      "@x402/extensions": false,
      "@x402/svm": false,
    };
    return config;
  },
};

export default nextConfig;
