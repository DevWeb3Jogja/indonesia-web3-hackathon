import { serverEnv } from "@iw3h/auth";
import { createDb } from "@iw3h/db";

// Thunk: env divalidasi saat query pertama, bukan saat build meng-import module.
export const db = createDb(
  () => serverEnv().TURSO_DATABASE_URL,
  () => serverEnv().TURSO_AUTH_TOKEN
);
