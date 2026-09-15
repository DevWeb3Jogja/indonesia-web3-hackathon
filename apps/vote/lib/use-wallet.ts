"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { useAccount } from "wagmi";

/**
 * Status wallet gabungan.
 *
 * `connecting` = true saat wagmi sedang auto-reconnect di awal load (atau saat
 * proses connect). Selama itu `isConnected` masih false PADAHAL wallet sebenarnya
 * tersambung → komponen ber-gate harus menampilkan LOADING, bukan "sign first".
 * (Bug: gate berkedip saat wallet belum selesai reconnect.)
 */
export function useWallet() {
  const { address, isConnected } = useAppKitAccount();
  const { isConnecting, isReconnecting } = useAccount();
  return { address, isConnected, connecting: isConnecting || isReconnecting };
}
