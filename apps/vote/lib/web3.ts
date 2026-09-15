import type { AppKitNetwork } from "@reown/appkit/networks";
import { bsc } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

// Hanya BNB Smart Chain (mainnet).
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [bsc];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});
