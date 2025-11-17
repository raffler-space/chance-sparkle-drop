import { getNetworkConfig } from "@/config/contracts";

export const getBlockExplorerUrl = (
  chainId: number | undefined,
  type: 'tx' | 'address',
  hash: string
): string => {
  const network = chainId ? getNetworkConfig(chainId) : null;
  const baseUrl = network?.blockExplorer || 'https://etherscan.io';
  return `${baseUrl}/${type}/${hash}`;
};
