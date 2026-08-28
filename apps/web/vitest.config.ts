import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Route handler di-uji langsung (node env). Alias @ = root app supaya
// `@/lib/*` resolve seperti di Next; @/lib/session & @/lib/turso di-mock per test.
export default defineConfig({
  test: { environment: "node", include: ["test/**/*.test.ts"] },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
});
