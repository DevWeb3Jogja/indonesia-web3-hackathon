import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

type RealDb = ReturnType<typeof build>;
export type Db = RealDb;

function build(url: string, authToken?: string) {
  if (!url) throw new Error("TURSO_DATABASE_URL kosong — cek .env (lihat .env.example)");
  return drizzle(createClient({ url, authToken }), { schema });
}

/**
 * URL/token boleh berupa thunk supaya validasi env DITUNDA sampai query pertama,
 * bukan saat import module — kalau tidak, `next build` yang meng-import route
 * handler untuk collect page data akan gagal hanya karena env belum ada di CI.
 */
export function createDb(
  url: string | (() => string),
  authToken?: string | (() => string | undefined)
): Db {
  let real: RealDb | null = null;
  const init = (): RealDb => {
    if (!real) {
      real = build(
        typeof url === "function" ? url() : url,
        typeof authToken === "function" ? authToken() : authToken
      );
    }
    return real;
  };
  return new Proxy({} as Db, {
    get(_t, prop) {
      // biome-ignore lint/suspicious/noExplicitAny: proxy meneruskan seluruh API drizzle apa adanya
      const value = (init() as any)[prop];
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}
