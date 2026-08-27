import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/schema";

/** DB in-memory dengan skema PERSIS produksi: migrasi asli yang di-apply, bukan tiruan. */
export async function testDb() {
  const client = createClient({ url: ":memory:" });
  const dir = join(__dirname, "..", "migrations");
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const statements = readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint");
    for (const stmt of statements) {
      if (stmt.trim()) await client.execute(stmt);
    }
  }
  return drizzle(client, { schema });
}
