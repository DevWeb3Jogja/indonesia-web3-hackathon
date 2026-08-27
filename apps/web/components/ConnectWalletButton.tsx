"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { projectId } from "@/lib/web3";

/** Tombol connect wallet dengan style situs (ganti default AppKit yang shadow-DOM). */
export default function ConnectWalletButton({ className = "" }: { className?: string }) {
  // Tanpa project ID AppKit tidak diinisialisasi — hook-nya bakal throw, jadi stop di sini.
  if (!projectId) return null;
  return <Inner className={className} />;
}

function Inner({ className }: { className: string }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const label =
    isConnected && address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect Wallet";

  return (
    <button type="button" onClick={() => open()} className={className}>
      {label}
    </button>
  );
}
