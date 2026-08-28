import { SIWE_CHAIN_IDS } from "@iw3h/auth/chains";
import {
  createSIWEConfig,
  formatMessage,
  type SIWECreateMessageArgs,
  type SIWEVerifyMessageArgs,
} from "@reown/appkit-siwe";

/**
 * One-Click Auth Reown: modal otomatis minta tanda tangan SIWE setelah connect.
 * Verifikasi dan session sepenuhnya di server (lihat app/api/auth/*).
 */
export const siweConfig = createSIWEConfig({
  getMessageParams: async () => ({
    domain: window.location.host,
    uri: window.location.origin,
    chains: SIWE_CHAIN_IDS,
    statement: "Sign in ke Indonesia Web3 Hackathon",
  }),
  createMessage: ({ address, ...args }: SIWECreateMessageArgs) => formatMessage(args, address),
  getNonce: async () => {
    const res = await fetch("/api/auth/nonce");
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
});
