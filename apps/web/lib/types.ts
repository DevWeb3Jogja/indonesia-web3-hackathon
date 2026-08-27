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

export interface TeamMember {
  name: string;
  role: string;
  social: string; // link X/LinkedIn/Telegram
}

export interface ExtraLink {
  label: string;
  url: string;
}

export interface Submission {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectName: string;
  tagline: string;
  teamName: string;
  tracks: TrackId[];
  contractAddress: string;
  network: NetworkId;
  problemStatement: string;
  solution: string;
  description: string; // markdown, support mermaid
  githubUrl: string;
  demoVideoUrl: string;
  demoUrl: string;
  teamMembers: TeamMember[];
  extraLinks: ExtraLink[];
  email: string;
  logoUrl: string;
}

/** Submission plus secret hash, never sent to client */
export interface StoredSubmission extends Submission {
  editCodeHash: string;
}

export type SubmissionInput = Omit<Submission, "id" | "createdAt" | "updatedAt">;

export function explorerUrl(network: NetworkId, address: string): string {
  const net = NETWORKS.find((n) => n.id === network) ?? NETWORKS[0];
  return net.explorer + address;
}

export function trackLabel(id: string): string {
  return TRACKS.find((t) => t.id === id)?.label ?? id;
}
