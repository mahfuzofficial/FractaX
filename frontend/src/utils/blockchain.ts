const RPC_ENV = import.meta.env.VITE_BLOCKCHAIN_ENV || 'local';

export function getExplorerUrl(txHash: string): string {
  if (RPC_ENV === 'amoy') {
    return `https://amoy.polygonscan.com/tx/${txHash}`;
  }
  if (RPC_ENV === 'mainnet') {
    return `https://polygonscan.com/tx/${txHash}`;
  }
  // Local — just show the hash in a readable way
  return `#`;
}

export function getTxHashDisplay(txHash: string): string {
  return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
}