import { SIWE_CHAIN_IDS } from "@iw3h/auth/chains";
import {
  createSIWEConfig,
  formatMessage,
  type SIWECreateMessageArgs,
  type SIWEVerifyMessageArgs,
} from "@reown/appkit-siwe";
import { getTurnstileToken } from "./turnstile";

export const siweConfig = createSIWEConfig({
  getMessageParams: async () => ({
    domain: window.location.host,
    uri: window.location.origin,
    chains: SIWE_CHAIN_IDS,
    statement: "Sign in ke Backoffice IW3H",
  }),
  createMessage: ({ address, ...args }: SIWECreateMessageArgs) => formatMessage(args, address),
  getNonce: async () => {
    const token = await getTurnstileToken();
    const res = await fetch("/api/auth/nonce", {
      headers: token ? { "x-turnstile-token": token } : {},
    });
    if (!res.ok) throw new Error("Gagal mengambil nonce");
    return res.text();
  },
  getSession: async () => {
    const res = await fetch("/api/auth/session");
    if (!res.ok) throw new Error("Gagal mengambil session");
    return res.json();
  },
  verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    return res.ok;
  },
  signOut: async () => {
    const res = await fetch("/api/auth/signout", { method: "POST" });
    return res.ok;
  },
  // Session di-set server-side saat verify; layout dashboard gate-nya server-side.
  // Reload setelah SIWE benar-benar sukses supaya server re-check role → dashboard
  // (bukan saat wallet connect, yang masih sebelum tanda tangan).
  onSignIn: () => {
    if (typeof window !== "undefined") window.location.reload();
  },
  onSignOut: () => {
    if (typeof window !== "undefined") window.location.reload();
  },
});
