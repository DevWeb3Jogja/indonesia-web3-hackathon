import type { Config } from "tailwindcss";

// Skin "evolve": monokrom gelap (hitam/putih/abu), display font pixel.
// Nama token dipertahankan agar komponen lama tetap jalan; nilainya di-remap
// ke palet gelap supaya seluruh app ikut berubah tanpa menyentuh tiap file.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#ffffff", // foreground utama (dulu teal gelap → putih di atas hitam)
        teal: "#d0d0d0", // aksen → abu terang (evolve monokrom)
        deep: "#8e8e8e",
        sky: "#ffffff",
        mist: "#000000", // section bg — hitam (evolve)
        haze: "#000000", // section bg — hitam (evolve)
      },
      fontFamily: {
        display: ["Geist Pixel Circle", "var(--font-body)", "monospace"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
