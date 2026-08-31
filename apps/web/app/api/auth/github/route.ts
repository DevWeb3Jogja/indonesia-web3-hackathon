import { randomBytes } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/session";
import { siteBase } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Mulai OAuth GitHub: butuh sudah sign-in (SIWE), lalu redirect ke GitHub. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = siteBase(req);
  const next = url.searchParams.get("next") || "/en/profile";
  const session = await auth.getSession();
  if (!session.address) return NextResponse.redirect(new URL(next, base));

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    const to = new URL(next, base);
    to.searchParams.set("github", "unconfigured");
    return NextResponse.redirect(to);
  }

  const state = randomBytes(16).toString("hex");
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", `${base}/api/auth/github/callback`);
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "false");

  const res = NextResponse.redirect(authorize);
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("gh_oauth_state", state, cookieOpts);
  // Simpan path balik (locale-aware) untuk redirect di callback.
  res.cookies.set("gh_oauth_next", next.startsWith("/") ? next : "/en/profile", cookieOpts);
  return res;
}
