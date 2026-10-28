import { PrivyClient, type User } from "@privy-io/node";

/**
 * Klien Privy server (login penonton via email/Google/wallet). App ID publik (dipakai
 * juga di browser); secret HANYA di server. Salah satu kosong → null (login nonaktif,
 * route membalas 503 — bukan crash saat import).
 */
let client: PrivyClient | null = null;
export function privy(): PrivyClient | null {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) return null;
  client ??= new PrivyClient({ appId, appSecret });
  return client;
}

/**
 * Alamat EVM yang jadi identitas pemilih (kolom votes.voter_address).
 * Wallet eksternal didahulukan: admin/peserta yang login pakai wallet aslinya tetap
 * dikenali (role admin, cek "bukan project sendiri"). Tanpa wallet eksternal → wallet
 * embedded buatan Privy (login email/Google).
 */
export function pickWalletAddress(user: Pick<User, "linked_accounts">): string | null {
  const evm = user.linked_accounts.filter(
    (a): a is Extract<(typeof user.linked_accounts)[number], { type: "wallet" }> =>
      a.type === "wallet" && "chain_type" in a && a.chain_type === "ethereum"
  );
  const external = evm.find((a) => a.wallet_client_type !== "privy");
  const embedded = evm.find((a) => a.wallet_client_type === "privy");
  return (external ?? embedded)?.address ?? null;
}
