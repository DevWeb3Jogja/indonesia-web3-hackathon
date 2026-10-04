import { resolve } from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

// Alias @ = root app supaya route bisa di-uji langsung (node env); @/lib/session &
// @/lib/turso di-mock per test untuk menyuntik aktor & DB in-memory.
export default defineConfig({
  test: { environment: "node", exclude: [...configDefaults.exclude, ".next/**"] },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
});
