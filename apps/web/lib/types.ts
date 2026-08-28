export const TRACKS = [
  { id: "ai-agents", label: "AI Agents", code: "T1" },
  { id: "finance-commerce", label: "Finance & Commerce", code: "T2" },
  { id: "consumer-apps", label: "Consumer Apps", code: "T3" },
] as const;

export type TrackId = (typeof TRACKS)[number]["id"];

export const NETWORKS = [
  { id: "bsc", label: "BNB Smart Chain (Mainnet)", explorer: "https://bscscan.com/address/" },
  { id: "bsc-testnet", label: "BSC Testnet", explorer: "https://testnet.bscscan.com/address/" },
  { id: "opbnb", label: "opBNB", explorer: "https://opbnb.bscscan.com/address/" },
  {
    id: "opbnb-testnet",
    label: "opBNB Testnet",
    explorer: "https://opbnb-testnet.bscscan.com/address/",
  },
] as const;

export type NetworkId = (typeof NETWORKS)[number]["id"];

/** Bentuk kartu project dari Turso untuk galeri publik (GET /api/projects). */
export interface PublicProjectCard {
  id: string;
  name: string;
  tagline: string;
  logoUrl: string;
  trackIds: string[];
  teamName: string | null; // null = solo
}

export function explorerUrl(network: NetworkId, address: string): string {
  const net = NETWORKS.find((n) => n.id === network) ?? NETWORKS[0];
  return net.explorer + address;
}

export function trackLabel(id: string): string {
  return TRACKS.find((t) => t.id === id)?.label ?? id;
}
