import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getNetworkConfig } from '@/config/contracts';

// ERC20 ABI for USDT interactions
const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function mintWithDecimals(address to, uint256 amount)',
];

export const useUSDTContract = (chainId: number | undefined, account: string | null) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isContractReady, setIsContractReady] = useState(false);

  useEffect(() => {
    const initContract = async () => {
      console.log('=== USDT Contract Initialization ===');
      console.log('ChainId:', chainId);
      console.log('Account:', account);
      console.log('Window ethereum available:', !!window.ethereum);
      
      if (!chainId || !account) {
        console.log('Missing chainId or account, setting ready to false');
        setIsContractReady(false);
        setContract(null);
        return;
      }

      try {
        const networkConfig = getNetworkConfig(chainId);
        if (!networkConfig) {
          console.error('Unsupported network:', chainId);
          setIsContractReady(false);
          setContract(null);
          return;
        }

        const usdtAddress = networkConfig.contracts.usdt;
        if (!usdtAddress) {
          console.error('USDT contract not configured for this network');
          setIsContractReady(false);
          setContract(null);
          return;
        }

        console.log('USDT Address:', usdtAddress);

        // Check if window.ethereum is available
        if (!window.ethereum) {
          console.error('window.ethereum not available - WalletConnect may need time to inject');
          // Try again after a short delay
          setTimeout(() => {
            initContract();
          }, 1000);
          return;
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        console.log('Provider created, getting signer...');
        
        const signer = provider.getSigner();
        console.log('Signer obtained');
        
        const usdtContract = new ethers.Contract(usdtAddress, USDT_ABI, signer);
        console.log('USDT Contract initialized successfully');

        setContract(usdtContract);
        setIsContractReady(true);
      } catch (error) {
        console.error('Error initializing USDT contract:', error);
        setIsContractReady(false);
        setContract(null);
      }
    };

    initContract();
  }, [chainId, account]);

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
    if (!contract) throw new Error('Contract not initialized');

    try {
      const decimals = await contract.decimals();
      const amountInSmallestUnit = ethers.utils.parseUnits(amount, decimals);
      const tx = await contract.approve(spender, amountInSmallestUnit);
      return tx;
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

  return {
    contract,
    isContractReady,
    getBalance,
    approve,
    getAllowance,
    mintTestTokens,
  };
};
