import { createAuth, serverEnv } from "@iw3h/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/turso";

// Cookie name + SESSION_SECRET + cookieDomain SAMA dengan apps/web → session
// dibagi lintas subdomain (indonesiaweb3hack.xyz ↔ vote.indonesiaweb3hack.xyz).
// Prod: set AUTH_COOKIE_DOMAIN=".indonesiaweb3hack.xyz" di kedua app.
export const auth = createAuth({
  db,
  cookies: () => cookies(),
  password: () => serverEnv().SESSION_SECRET,
  cookieName: "iw3h_session",
  cookieDomain: () => process.env.AUTH_COOKIE_DOMAIN,
});

export const requireAuth = auth.requireAuth;
