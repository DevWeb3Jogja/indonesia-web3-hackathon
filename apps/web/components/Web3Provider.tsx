"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { siweConfig } from "@/lib/siwe";
import { networks, projectId, wagmiAdapter } from "@/lib/web3";

const queryClient = new QueryClient();

if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata: {
      name: "Indonesia Web3 Hackathon",
      description: "Indonesia Web3 Hackathon 2026",
      // WAJIB sama dengan origin halaman — kalau beda, redirect social login
      // (Google, dll) & verifikasi Reown gagal. Pakai origin asli saat di client.
      url:
        typeof window !== "undefined"
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://indonesiaweb3hack.xyz"),
      icons: ["https://indonesiaweb3hack.xyz/favicon-32x32.png"],
    },
    themeVariables: {
      "--w3m-accent": "#066377",
    },
    // Matikan analytics AppKit — hilangkan "Analytics SDK: Failed to fetch" & tidak kirim telemetri.
    features: { analytics: false },
    siweConfig,
  });
} else if (typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_WC_PROJECT_ID kosong — connect wallet nonaktif");
}

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
