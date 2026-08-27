import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#154359",
        teal: "#066377",
        deep: "#185B7B",
        sky: "#4BBDF0",
        mist: "#F0F0F0",
        haze: "#F0F5F7",
      },
      fontFamily: {
        display: ["TT Firs Neue", "var(--font-body)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
