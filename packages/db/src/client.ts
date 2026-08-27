import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

export function createDb(url: string, authToken?: string) {
  if (!url) throw new Error("TURSO_DATABASE_URL kosong — cek .env (lihat .env.example)");
  return drizzle(createClient({ url, authToken }), { schema });
}
