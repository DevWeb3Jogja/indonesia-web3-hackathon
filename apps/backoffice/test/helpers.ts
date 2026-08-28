import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { schema } from "@iw3h/db";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

/** DB in-memory dengan skema PERSIS produksi (migrasi asli @iw3h/db). */
export async function makeDb() {
  const client = createClient({ url: ":memory:" });
  const dir = join(__dirname, "..", "..", "..", "packages", "db", "migrations");
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    for (const stmt of readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await client.execute(stmt);
    }
  }
  return drizzle(client, { schema });
}

export const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;

export function jsonReq(body: unknown) {
  return new Request("http://test/local", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
