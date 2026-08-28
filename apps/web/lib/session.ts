import { createAuth, serverEnv } from "@iw3h/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/turso";

export const auth = createAuth({
  db,
  // Next 16: cookies() async → Promise; auth package meng-await-nya.
  cookies: () => cookies(),
  password: () => serverEnv().SESSION_SECRET,
  cookieName: "iw3h_session",
});

export const requireAuth = auth.requireAuth;
