import { clientIp, verifyTurnstile } from "@iw3h/auth";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Gate Turnstile sebelum menerbitkan nonce — melindungi sign-in admin. */
export async function GET(req: Request) {
  const ok = await verifyTurnstile(req.headers.get("x-turnstile-token"), clientIp(req));
  if (!ok) return new Response("turnstile_failed", { status: 403 });
  return auth.handlers.nonce();
}
