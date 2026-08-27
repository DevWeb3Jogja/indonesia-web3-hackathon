import { createPublicClient, http } from "viem";
import { bsc, bscTestnet, opBNB, opBNBTestnet } from "viem/chains";

/** Network hackathon (selaras dengan NETWORKS di apps/web/lib/types.ts). */
export const CHAIN_BY_NETWORK = {
  bsc,
  "bsc-testnet": bscTestnet,
  opbnb: opBNB,
  "opbnb-testnet": opBNBTestnet,
} as const;

export type NetworkId = keyof typeof CHAIN_BY_NETWORK;

export const SIWE_CHAIN_IDS: number[] = Object.values(CHAIN_BY_NETWORK).map((c) => c.id);

export function publicClient(chainId: number) {
  const chain = Object.values(CHAIN_BY_NETWORK).find((c) => c.id === chainId);
  if (!chain) throw new Error(`Chain ${chainId} tidak didukung`);
  return createPublicClient({ chain, transport: http() });
}

/** Cek alamat benar-benar kontrak (punya bytecode) di network yang dipilih. */
export async function isContract(network: NetworkId, address: `0x${string}`): Promise<boolean> {
  const code = await publicClient(CHAIN_BY_NETWORK[network].id).getCode({ address });
  return code !== undefined && code !== "0x";
}
