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
  members: { address: string; githubUrl: string | null; username: string | null }[];
}

/**
 * Network project → entri NETWORKS. Kolom `network` berisi id dari form ("bsc-testnet")
 * ATAU label dari data impor ("BNB Smart Chain Testnet", "opBNB Testnet"). Tak dikenal → BSC mainnet.
 */
export function networkOf(raw: string | null | undefined): (typeof NETWORKS)[number] {
  const s = (raw ?? "").toLowerCase();
  const byId = NETWORKS.find((n) => n.id === s);
  if (byId) return byId;
  const id = `${s.includes("opbnb") ? "opbnb" : "bsc"}${s.includes("test") ? "-testnet" : ""}`;
  return NETWORKS.find((n) => n.id === id) ?? NETWORKS[0];
}

export function explorerUrl(network: string | null | undefined, address: string): string {
  return networkOf(network).explorer + address;
}

/** Link explorer untuk address (0x + 40 hex) atau tx hash (0x + 64 hex); null kalau bukan keduanya. */
export function explorerLink(network: string | null | undefined, value: string): string | null {
  if (/^0x[0-9a-fA-F]{40}$/.test(value)) return explorerUrl(network, value);
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) {
    return networkOf(network).explorer.replace(/address\/$/, "tx/") + value;
  }
  return null;
}

export function trackLabel(id: string): string {
  return TRACKS.find((t) => t.id === id)?.label ?? id;
}
