import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWalletClient } from 'wagmi';
import { getNetworkConfig } from '@/config/contracts';

// ERC20 ABI for USDT interactions
const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function mintWithDecimals(address to, uint256 amount)',
];

export const useUSDTContract = (chainId: number | undefined, account: string | null) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isContractReady, setIsContractReady] = useState(false);
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    const initContract = async () => {
      if (!chainId || !account) {
        setIsContractReady(false);
        return;
      }

      try {
        const networkConfig = getNetworkConfig(chainId);
        if (!networkConfig) {
          console.error('Unsupported network');
          setIsContractReady(false);
          return;
        }

        const usdtAddress = networkConfig.contracts.usdt;
        if (!usdtAddress) {
          console.error('USDT contract not configured for this network');
          setIsContractReady(false);
          return;
        }

        if (!walletClient) {
          console.error('Wallet client not available');
          setIsContractReady(false);
          return;
        }
        
        const provider = new ethers.providers.Web3Provider(walletClient.transport as any);
        const signer = provider.getSigner();
        const usdtContract = new ethers.Contract(usdtAddress, USDT_ABI, signer);

        setContract(usdtContract);
        setIsContractReady(true);
      } catch (error) {
        console.error('Error initializing USDT contract:', error);
        setIsContractReady(false);
      }
    };

    initContract();
  }, [chainId, account, walletClient]);

  const getBalance = async (address: string): Promise<string> => {
    if (!contract) throw new Error('Contract not initialized');

    try {
      const balance = await contract.balanceOf(address);
      const decimals = await contract.decimals();
      return ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error getting USDT balance:', error);
      throw error;
    }
  };

  const approve = async (spender: string, amount: string): Promise<ethers.ContractTransaction> => {
    if (!contract || !account) throw new Error('Contract not initialized');

    try {
      const decimals = await contract.decimals();
      const amountInSmallestUnit = ethers.utils.parseUnits(amount, decimals);
      
      // Check current allowance
      const currentAllowance = await contract.allowance(account, spender);
      
      // USDT on mainnet requires resetting allowance to 0 before setting a new non-zero amount
      // This is a security feature to prevent the approve race condition
      if (!currentAllowance.isZero()) {
        console.log('Existing USDT allowance detected, resetting to 0 first...');
        try {
          const resetTx = await contract.approve(spender, 0, { gasLimit: 200000 });
          await resetTx.wait();
          console.log('Allowance reset to 0 successfully');
        } catch (resetError) {
          console.error('Error resetting allowance:', resetError);
          throw new Error('Failed to reset USDT allowance. Please try again.');
        }
      }
      
      try {
        // Now approve the new amount with automatic gas estimation
        const tx = await contract.approve(spender, amountInSmallestUnit);
        return tx;
      } catch (gasError: any) {
        // If gas estimation fails, retry with manual gas limit
        if (gasError.message?.includes('cannot estimate gas') || 
            gasError.message?.includes('execution reverted') ||
            gasError.code === 'UNPREDICTABLE_GAS_LIMIT') {
          console.log('Gas estimation failed, retrying with higher manual gas limit');
          const tx = await contract.approve(spender, amountInSmallestUnit, {
            gasLimit: 200000
          });
          return tx;
        }
        throw gasError;
      }
    } catch (error) {
      console.error('Error approving USDT:', error);
      throw error;
    }
  };

  const getAllowance = async (owner: string, spender: string): Promise<string> => {
    if (!contract) throw new Error('Contract not initialized');

    try {
      const allowance = await contract.allowance(owner, spender);
      const decimals = await contract.decimals();
      return ethers.utils.formatUnits(allowance, decimals);
    } catch (error) {
      console.error('Error getting allowance:', error);
      throw error;
    }
  };

  const mintTestTokens = async (amount: string): Promise<ethers.ContractTransaction> => {
    if (!contract || !account) throw new Error('Contract or account not available');

    try {
      // Use mintWithDecimals for easier testing (amount in whole USDT)
      const tx = await contract.mintWithDecimals(account, amount);
      return tx;
    } catch (error) {
      console.error('Error minting test USDT:', error);
      throw error;
    }
  };

  const transfer = async (to: string, amount: string): Promise<ethers.ContractTransaction> => {
    if (!contract) throw new Error('Contract not initialized');

    try {
      const decimals = await contract.decimals();
      const amountInSmallestUnit = ethers.utils.parseUnits(amount, decimals);
      const tx = await contract.transfer(to, amountInSmallestUnit);
      return tx;
    } catch (error) {
      console.error('Error transferring USDT:', error);
      throw error;
    }
  };

  return {
    contract,
    isContractReady,
    getBalance,
    approve,
    getAllowance,
    mintTestTokens,
    transfer,
  };
};
