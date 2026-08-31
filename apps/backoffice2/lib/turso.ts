import { serverEnv } from "@iw3h/auth";
import { createDb } from "@iw3h/db";

export const db = createDb(
  () => serverEnv().TURSO_DATABASE_URL,
  () => serverEnv().TURSO_AUTH_TOKEN
);
