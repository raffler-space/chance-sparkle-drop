import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getNetworkConfig } from '@/config/contracts';

const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function mintWithDecimals(address to, uint256 amount)',
];

export const useUSDTContract = (chainId: number | undefined, account: string | null) => {
  const [readContract, setReadContract] = useState<ethers.Contract | null>(null);
  const [writeContract, setWriteContract] = useState<ethers.Contract | null>(null);
  const [isContractReady, setIsContractReady] = useState(false);

  useEffect(() => {
    const initContract = async () => {
      if (!chainId) {
        setIsContractReady(false);
        return;
      }

      try {
        const networkConfig = getNetworkConfig(chainId);
        if (!networkConfig?.contracts.usdt) {
          setIsContractReady(false);
          return;
        }

        const publicProvider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
        const readOnlyContract = new ethers.Contract(networkConfig.contracts.usdt, USDT_ABI, publicProvider);
        setReadContract(readOnlyContract);

        if (account && window.ethereum) {
          const walletProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
          const signer = walletProvider.getSigner();
          const writeableContract = new ethers.Contract(networkConfig.contracts.usdt, USDT_ABI, signer);
          setWriteContract(writeableContract);
        }

        setIsContractReady(true);
      } catch (error) {
        console.error('Error initializing USDT contract:', error);
        setIsContractReady(false);
      }
    };

    initContract();
  }, [chainId, account]);

  const getBalance = async (address: string): Promise<string> => {
    if (!readContract) throw new Error('Contract not initialized');
    const balance = await readContract.balanceOf(address);
    const decimals = await readContract.decimals();
    return ethers.utils.formatUnits(balance, decimals);
  };

  const approve = async (spender: string, amount: string): Promise<ethers.ContractTransaction> => {
    if (!writeContract) throw new Error('Write contract not initialized');
    const decimals = await readContract?.decimals() || 6;
    const amountInSmallestUnit = ethers.utils.parseUnits(amount, decimals);
    return await writeContract.approve(spender, amountInSmallestUnit);
  };

  const getAllowance = async (owner: string, spender: string): Promise<string> => {
    if (!readContract) throw new Error('Contract not initialized');
    const allowance = await readContract.allowance(owner, spender);
    const decimals = await readContract.decimals();
    return ethers.utils.formatUnits(allowance, decimals);
  };

  const mintTestTokens = async (amount: string): Promise<ethers.ContractTransaction> => {
    if (!writeContract || !account) throw new Error('Contract or account not available');
    return await writeContract.mintWithDecimals(account, amount);
  };

  return {
    contract: readContract,
    isContractReady,
    getBalance,
    approve,
    getAllowance,
    mintTestTokens,
  };
};
