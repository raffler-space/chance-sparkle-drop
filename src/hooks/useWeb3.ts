import { useAccount, useDisconnect, useChainId } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export const useWeb3 = () => {
  const { address, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const chainId = useChainId();

  const connectWallet = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const disconnectWallet = () => {
    disconnect();
  };

  return {
    account: address || null,
    chainId: chainId || 11155111, // Default to Sepolia for read-only operations
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
};
