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
      name: "IW3H Demo Day Vote",
      description: "Voting demo day Indonesia Web3 Hackathon",
      url:
        typeof window !== "undefined"
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vote.indonesiaweb3hack.xyz"),
      icons: ["https://indonesiaweb3hack.xyz/favicon-32x32.png"],
    },
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#f2ba2b",
    },
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
