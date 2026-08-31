import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Route admin di-uji langsung (node env). Alias @ = root app; @/lib/auth &
// @/lib/turso di-mock per test untuk menyuntik aktor & DB in-memory.
export default defineConfig({
  test: { environment: "node", include: ["test/**/*.test.ts"] },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
});
