import { createAuth, serverEnv } from "@iw3h/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/turso";

// Cookie name berbeda dari web — session tidak saling nyasar di dev (sama-sama localhost).
export const auth = createAuth({
  db,
  cookies: () => cookies(),
  password: serverEnv().SESSION_SECRET,
  cookieName: "iw3h_admin",
});

export const requireAuth = auth.requireAuth;
