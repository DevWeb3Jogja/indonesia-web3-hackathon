import type { AppKitNetwork } from "@reown/appkit/networks";
import { bsc, bscTestnet, opBNB, opBNBTestnet } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

// Selaras dengan NETWORKS di lib/types.ts — hackathon ini target BNB Chain.
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [bsc, opBNB, bscTestnet, opBNBTestnet];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});
