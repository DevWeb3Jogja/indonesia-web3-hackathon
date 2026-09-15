import type { Config } from "tailwindcss";

// Palet dari referensi UI (motionsites/10.html): dark #0C0C0C, teks/border #D7E2EA,
// aksen gold brand IW3H #f2ba2b. Font Kanit (lihat app/layout.tsx via next/font).
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0C0C0C",
        mist: "#D7E2EA",
        brand: "#f2ba2b",
      },
      fontFamily: {
        sans: ["var(--font-kanit)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
