import { createAuth, serverEnv } from "@iw3h/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/turso";

export const auth = createAuth({
  db,
  cookies: () => cookies(),
  password: serverEnv().SESSION_SECRET,
  cookieName: "iw3h_session",
});

export const requireAuth = auth.requireAuth;
