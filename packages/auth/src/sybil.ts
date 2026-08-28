import { CHAIN_BY_NETWORK, publicClient } from "./chains";

/**
 * Lapisan anti-sybil tambahan (di atas SIWE + rate-limit per-IP + satu-entitas-
 * per-wallet). Gate reputasi on-chain: wallet harus punya aktivitas minimum
 * (jumlah transaksi / nonce) di BNB Chain sebelum boleh membuat tim/submit.
 *
 * OPT-IN via SYBIL_MIN_TX (default 0 = mati), karena hackathon perlu meng-onboard
 * builder baru yang wallet-nya masih segar — tidak ada sinyal on-chain yang bisa
 * membedakan wallet-baru-sah dari wallet-throwaway. Organizer menyalakan gate ini
 * kalau spam jadi masalah.
 */
export interface SybilPolicy {
  minTxCount: number;
}

export function sybilPolicyFromEnv(): SybilPolicy {
  return { minTxCount: Math.max(0, Number(process.env.SYBIL_MIN_TX ?? "0")) };
}

export interface SybilResult {
  ok: boolean;
  reason?: "insufficient_activity" | "rpc_error";
  txCount?: number;
}

async function defaultGetTxCount(address: `0x${string}`): Promise<number> {
  return publicClient(CHAIN_BY_NETWORK.bsc.id).getTransactionCount({ address });
}

/**
 * `getTxCount` bisa di-inject untuk test. Fail-open kalau RPC error — jangan
 * blokir user sah gara-gara infra RPC bermasalah (caller boleh log reason).
 */
export async function checkWalletSybil(
  address: `0x${string}`,
  policy: SybilPolicy,
  getTxCount: (a: `0x${string}`) => Promise<number> = defaultGetTxCount
): Promise<SybilResult> {
  if (policy.minTxCount <= 0) return { ok: true }; // gate mati
  let txCount: number;
  try {
    txCount = await getTxCount(address);
  } catch {
    return { ok: true, reason: "rpc_error" };
  }
  return txCount >= policy.minTxCount
    ? { ok: true, txCount }
    : { ok: false, reason: "insufficient_activity", txCount };
}
