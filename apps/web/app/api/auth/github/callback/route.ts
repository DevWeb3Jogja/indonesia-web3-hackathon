import { linkGithub } from "@iw3h/db";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/**
 * Callback OAuth GitHub: verifikasi state, tukar code→token, ambil identitas
 * GitHub, lalu tautkan ke wallet yang sedang sign-in. Token cuma dipakai sekali
 * (ambil /user) lalu dibuang — tidak disimpan.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = req.cookies.get("gh_oauth_next")?.value || "/en/profile";
  const done = (github: string) => {
    const to = new URL(next.startsWith("/") ? next : "/en/profile", url.origin);
    to.searchParams.set("github", github);
    const res = NextResponse.redirect(to);
    res.cookies.delete("gh_oauth_state");
    res.cookies.delete("gh_oauth_next");
    return res;
  };

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = req.cookies.get("gh_oauth_state")?.value;
  if (!code || !state || !savedState || state !== savedState) return done("error");

  const session = await auth.getSession();
  if (!session.address) return done("error");

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return done("unconfigured");

  // code → access_token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${url.origin}/api/auth/github/callback`,
    }),
  });
  const tokenJson = (await tokenRes.json().catch(() => null)) as { access_token?: string } | null;
  const accessToken = tokenJson?.access_token;
  if (!accessToken) return done("error");

  // token → identitas GitHub
  const ghRes = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
      "user-agent": "iw3h-oauth",
    },
  });
  const gh = (await ghRes.json().catch(() => null)) as { id?: number; login?: string } | null;
  if (!gh?.id || !gh?.login) return done("error");

  const linked = await linkGithub(db, session.address, { id: String(gh.id), login: gh.login });
  return done(linked.ok ? "ok" : "taken");
}
