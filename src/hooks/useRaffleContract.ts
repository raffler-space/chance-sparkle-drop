import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { getNetworkConfig, RAFFLE_ABI, isSupportedNetwork } from '@/config/contracts';

export const useRaffleContract = (chainId: number | undefined, account: string | undefined) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isContractReady, setIsContractReady] = useState(false);

  useEffect(() => {
    const initContract = async () => {
      console.log('=== Contract Initialization ===');
      console.log('ChainId:', chainId);
      console.log('Account:', account);
      
      if (!chainId || !account) {
        console.log('Missing chainId or account');
        setContract(null);
        setIsContractReady(false);
        return;
      }

      if (!isSupportedNetwork(chainId)) {
        console.log('Unsupported network:', chainId);
        toast.error('Unsupported network. Please switch to Sepolia or Ethereum Mainnet.');
        setContract(null);
        setIsContractReady(false);
        return;
      }

      const networkConfig = getNetworkConfig(chainId);
      if (!networkConfig) {
        console.log('No network config found');
        setIsContractReady(false);
        return;
      }

      console.log('Network config:', networkConfig);
      console.log('Contract address:', networkConfig.contracts.raffle);

      // Check if contract address is set
      if (networkConfig.contracts.raffle === "0x0000000000000000000000000000000000000000") {
        console.log('Contract not deployed');
        toast.error('Contract not deployed yet. Please deploy the contract first.');
        setIsContractReady(false);
        return;
      }

      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const raffleContract = new ethers.Contract(
          networkConfig.contracts.raffle,
          RAFFLE_ABI,
          signer
        );

        console.log('Contract initialized successfully');
        setSigner(signer);
        setContract(raffleContract);
        setIsContractReady(true);
      } catch (error) {
        console.error('Error initializing contract:', error);
        toast.error('Failed to initialize contract');
        setIsContractReady(false);
      }
    };

    initContract();
  }, [chainId, account]);

  // Create a new raffle (admin only)
  const createRaffle = useCallback(async (
    name: string,
    description: string,
    ticketPriceEth: string,
    maxTickets: number,
    durationDays: number,
    nftContract?: string
  ) => {
    if (!contract || !chainId) {
      toast.error('Contract not initialized');
      return null;
    }

    const networkConfig = getNetworkConfig(chainId);
    if (!networkConfig) {
      toast.error('Network configuration not found');
      return null;
    }

    try {
      const ticketPrice = ethers.utils.parseEther(ticketPriceEth);
      const duration = Math.floor(durationDays * 24 * 60 * 60); // Convert days to seconds (must be integer)
      const nftAddress = nftContract || ethers.constants.AddressZero;

      // Validate duration
      if (duration < 1) {
        toast.error('Duration must be at least 1 second (0.0000116 days)');
        return null;
      }

      console.log('Creating raffle with params:', {
        name,
        description,
        ticketPrice: ticketPrice.toString(),
        ticketPriceEth: ethers.utils.formatEther(ticketPrice),
        maxTickets,
        duration,
        durationDays,
        nftAddress
      });

      // First verify the contract is responsive and has expected functions
      console.log('Verifying contract...');
      try {
        // Try reading simpler values first
        const owner = await contract.owner();
        console.log('✓ Contract owner:', owner);
        
        try {
          const platformFee = await contract.platformFee();
          console.log('✓ Platform fee:', platformFee.toString());
        } catch (e: any) {
          console.warn('⚠ platformFee() not available:', e.message);
        }
        
        try {
          const raffleCounter = await contract.raffleCounter();
          console.log('✓ Current raffle counter:', raffleCounter.toString());
        } catch (e: any) {
          console.error('✗ raffleCounter() failed:', e.message);
          throw new Error(`Contract ABI mismatch. The deployed contract at ${networkConfig.contracts.raffle} may not be the Raffle contract, or was compiled differently. Please verify on ${networkConfig.blockExplorer}.`);
        }
      } catch (e: any) {
        console.error('Contract verification failed:', e);
        throw e;
      }

      // Try to call the function first to get better error messages
      try {
        console.log('Attempting static call...');
        const result = await contract.callStatic.createRaffle(
          name,
          description,
          ticketPrice,
          maxTickets,
          duration,
          nftAddress
        );
        console.log('Static call succeeded, raffle ID would be:', result.toString());
      } catch (staticError: any) {
        console.error('Static call failed:', staticError);
        console.error('Static call error details:', {
          message: staticError.message,
          reason: staticError.reason,
          code: staticError.code,
          data: staticError.data
        });
        
        // Common issues
        let errorMsg = 'Contract reverted. ';
        if (staticError.message.includes('CALL_EXCEPTION')) {
          errorMsg += 'Possible issues: 1) Contract is paused, 2) Missing required setup, 3) Invalid parameters. ';
          errorMsg += `Check ${networkConfig.name} explorer for contract state: ${networkConfig.blockExplorer}/address/${networkConfig.contracts.raffle}#readContract`;
        }
        throw new Error(errorMsg);
      }

      console.log('Sending transaction with explicit gas limit...');
      const tx = await contract.createRaffle(
        name,
        description,
        ticketPrice,
        maxTickets,
        duration,
        nftAddress,
        {
          gasLimit: 500000 // Explicit gas limit
        }
      );

      toast.loading('Creating raffle...', { id: 'create-raffle' });
      const receipt = await tx.wait();
      
      // Extract raffle ID from event
      const event = receipt.events?.find((e: any) => e.event === 'RaffleCreated');
      const raffleId = event?.args?.raffleId?.toString();

      toast.success('Raffle created successfully!', { id: 'create-raffle' });
      return raffleId;
    } catch (error: any) {
      console.error('Error creating raffle:', error);
      console.error('Error details:', {
        reason: error.reason,
        code: error.code,
        message: error.message,
        data: error.data,
        error: error.error
      });
      
      let errorMessage = 'Failed to create raffle';
      
      // Try to extract revert reason from error
      if (error.error?.data?.message) {
        errorMessage = error.error.data.message;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        // Parse common error messages
        if (error.message.includes('Ownable: caller is not the owner')) {
          errorMessage = 'Only the contract owner can create raffles';
        } else if (error.message.includes('execution reverted')) {
          errorMessage = 'Transaction reverted. Possible issues: Invalid parameters, VRF setup, or contract state. Check console for details.';
        } else {
          errorMessage = error.message.substring(0, 200); // Truncate long messages
        }
      }
      
      toast.error(errorMessage, { id: 'create-raffle', duration: 8000 });
      return null;
    }
  }, [contract]);

  // Buy tickets for a raffle
  const buyTickets = useCallback(async (raffleId: number, quantity: number) => {
    if (!contract) {
      toast.error('Contract not initialized');
      return false;
    }

    try {
      // Get raffle info to calculate price
      const raffleInfo = await contract.raffles(raffleId);
      const totalPrice = raffleInfo.ticketPrice.mul(quantity);

      const tx = await contract.buyTickets(raffleId, quantity, {
        value: totalPrice
      });

      toast.loading('Purchasing tickets...', { id: 'buy-tickets' });
      await tx.wait();

      toast.success(`Successfully purchased ${quantity} ticket(s)!`, { id: 'buy-tickets' });
      return true;
    } catch (error: any) {
      console.error('Error buying tickets:', error);
      toast.error(error.reason || 'Failed to purchase tickets', { id: 'buy-tickets' });
      return false;
    }
  }, [contract]);

  // Select winner (admin only)
  const selectWinner = useCallback(async (raffleId: number) => {
    if (!contract) {
      toast.error('Contract not initialized');
      return false;
    }

    try {
      const tx = await contract.selectWinner(raffleId);

      toast.loading('Requesting winner selection...', { id: 'select-winner' });
      await tx.wait();

      toast.success('Winner selection requested! Waiting for Chainlink VRF...', { id: 'select-winner' });
      return true;
    } catch (error: any) {
      console.error('Error selecting winner:', error);
      toast.error(error.reason || 'Failed to select winner', { id: 'select-winner' });
      return false;
    }
  }, [contract]);

  // Claim prize (winner only)
  const claimPrize = useCallback(async (raffleId: number) => {
    if (!contract) {
      toast.error('Contract not initialized');
      return false;
    }

    try {
      const tx = await contract.claimPrize(raffleId);

      toast.loading('Claiming prize...', { id: 'claim-prize' });
      await tx.wait();

      toast.success('Prize claimed successfully!', { id: 'claim-prize' });
      return true;
    } catch (error: any) {
      console.error('Error claiming prize:', error);
      toast.error(error.reason || 'Failed to claim prize', { id: 'claim-prize' });
      return false;
    }
  }, [contract]);

  // Get raffle info
  const getRaffleInfo = useCallback(async (raffleId: number) => {
    if (!contract) return null;

    try {
      const info = await contract.raffles(raffleId);
      return {
        name: info.name,
        description: info.description,
        ticketPrice: ethers.utils.formatEther(info.ticketPrice),
        maxTickets: info.maxTickets.toNumber(),
        ticketsSold: info.ticketsSold.toNumber(),
        endTime: new Date(info.endTime.toNumber() * 1000),
        winner: info.winner,
        isActive: info.isActive,
        vrfRequested: info.vrfRequested,
        nftContract: info.nftContract
      };
    } catch (error) {
      console.error('Error getting raffle info:', error);
      return null;
    }
  }, [contract]);

  // Get user entries
  const getUserEntries = useCallback(async (raffleId: number, userAddress: string) => {
    if (!contract) return [];

    try {
      const entries = await contract.getUserEntries(raffleId, userAddress);
      return entries.map((e: ethers.BigNumber) => e.toNumber());
    } catch (error) {
      console.error('Error getting user entries:', error);
      return [];
    }
  }, [contract]);

  // Check contract owner
  const checkOwner = useCallback(async () => {
    if (!contract || !account) return null;
    
    try {
      const owner = await contract.owner();
      console.log('Contract owner:', owner);
      console.log('Connected account:', account);
      console.log('Is owner:', owner.toLowerCase() === account.toLowerCase());
      return owner;
    } catch (error) {
      console.error('Error checking owner:', error);
      return null;
    }
  }, [contract, account]);

  return {
    contract,
    signer,
    isContractReady,
    createRaffle,
    buyTickets,
    selectWinner,
    claimPrize,
    getRaffleInfo,
    getUserEntries,
    checkOwner,
  };
};
