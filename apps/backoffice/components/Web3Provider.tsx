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
      name: "Backoffice IW3H",
      description: "Panel organizer Indonesia Web3 Hackathon",
      url: "https://admin.indonesia-web3-hackathon.vercel.app",
      icons: [],
    },
    themeVariables: {
      "--w3m-accent": "#066377",
    },
    // Matikan telemetri AppKit (hindari "Analytics SDK: Failed to fetch" & tak kirim data).
    features: { analytics: false },
    siweConfig,
  });
} else if (typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_WC_PROJECT_ID kosong — sign-in nonaktif");
}

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
