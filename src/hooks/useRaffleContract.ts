import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { useWalletClient, usePublicClient } from 'wagmi';
import { getNetworkConfig, RAFFLE_ABI, isSupportedNetwork } from '@/config/contracts';
import { supabase } from '@/integrations/supabase/client';

export const useRaffleContract = (chainId: number | undefined, account: string | undefined) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isContractReady, setIsContractReady] = useState(false);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  useEffect(() => {
    const initContract = async () => {
      console.log('=== Contract Initialization ===');
      console.log('ChainId:', chainId);
      console.log('Account:', account);
      
      // Use Sepolia as default if no chainId provided
      const activeChainId = chainId || 11155111; // Default to Sepolia
      
      if (!isSupportedNetwork(activeChainId)) {
        console.log('Unsupported network:', activeChainId);
        if (account) {
          toast.error('Unsupported network. Please switch to Sepolia or Ethereum Mainnet.');
        }
        setContract(null);
        setIsContractReady(false);
        return;
      }

      const networkConfig = getNetworkConfig(activeChainId);
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
        if (account) {
          toast.error('Contract not deployed yet. Please deploy the contract first.');
        }
        setIsContractReady(false);
        return;
      }

      try {
        let raffleContract: ethers.Contract;
        
        if (account && walletClient) {
          // If wallet is connected, use wallet client (works with WalletConnect)
          const provider = new ethers.providers.Web3Provider(walletClient.transport as any);
          const signer = provider.getSigner();
          raffleContract = new ethers.Contract(
            networkConfig.contracts.raffle,
            RAFFLE_ABI,
            signer
          );
          setSigner(signer);
          console.log('Contract initialized with signer');
        } else {
          // If no wallet connected, use read-only provider
          const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
          raffleContract = new ethers.Contract(
            networkConfig.contracts.raffle,
            RAFFLE_ABI,
            provider
          );
          setSigner(null);
          console.log('Contract initialized in read-only mode');
        }

        setContract(raffleContract);
        setIsContractReady(true);
      } catch (error) {
        console.error('Error initializing contract:', error);
        if (account) {
          toast.error('Failed to initialize contract');
        }
        setIsContractReady(false);
      }
    };

    initContract();
  }, [chainId, account, walletClient]);

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
      const ticketPrice = ethers.utils.parseUnits(ticketPriceEth, 6); // USDT uses 6 decimals
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
        ticketPriceUSDT: ethers.utils.formatUnits(ticketPrice, 6),
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

  // Get total raffle count from contract
  const getRaffleCounter = useCallback(async () => {
    if (!contract) {
      console.error('Contract not initialized');
      return 0;
    }

    try {
      const counter = await contract.raffleCounter();
      return counter.toNumber();
    } catch (error) {
      console.error('Error fetching raffle counter:', error);
      return 0;
    }
  }, [contract]);

  // Fetch all raffles from the blockchain
  const getAllRafflesFromChain = useCallback(async () => {
    if (!contract) {
      console.error('Contract not initialized');
      return [];
    }

    try {
      const counter = await getRaffleCounter();
      console.log(`Fetching ${counter} raffles from blockchain...`);
      
      const raffles = [];
      for (let i = 0; i < counter; i++) {
        try {
          const raffleInfo = await contract.raffles(i);
          raffles.push({
            contractRaffleId: i,
            name: raffleInfo.name,
            description: raffleInfo.description,
            ticketPrice: ethers.utils.formatUnits(raffleInfo.ticketPrice, 6),
            maxTickets: raffleInfo.maxTickets.toNumber(),
            ticketsSold: raffleInfo.ticketsSold.toNumber(),
            endTime: raffleInfo.endTime.toNumber(),
            isActive: raffleInfo.isActive,
            winner: raffleInfo.winner,
            vrfRequested: raffleInfo.vrfRequested,
            nftContract: raffleInfo.nftContract,
          });
        } catch (error) {
          console.error(`Error fetching raffle ${i}:`, error);
        }
      }
      
      console.log(`Fetched ${raffles.length} raffles from blockchain`);
      return raffles;
    } catch (error) {
      console.error('Error fetching all raffles from chain:', error);
      return [];
    }
  }, [contract, getRaffleCounter]);

  // Get raffle details from contract
  const getRaffleDetails = useCallback(async (raffleId: number) => {
    if (!contract) {
      console.error('Contract not initialized');
      return null;
    }

    try {
      const raffleInfo = await contract.raffles(raffleId);
      return {
        totalTickets: raffleInfo.totalTickets.toNumber(),
        ticketsSold: raffleInfo.ticketsSold.toNumber(),
        ticketPrice: ethers.utils.formatUnits(raffleInfo.ticketPrice, 6),
        endTime: raffleInfo.endTime.toNumber(),
        isActive: raffleInfo.isActive,
        winner: raffleInfo.winner,
      };
    } catch (error) {
      console.error('Error fetching raffle details:', error);
      return null;
    }
  }, [contract]);

  // Get user's ticket entries for a raffle
  const getUserTickets = useCallback(async (raffleId: number, userAddress: string) => {
    if (!contract) {
      console.error('Contract not initialized');
      return [];
    }

    try {
      const entries = await contract.getUserEntries(raffleId, userAddress);
      return entries.map((entry: any) => entry.toNumber());
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      return [];
    }
  }, [contract]);

  // Buy tickets for a raffle
  const buyTickets = useCallback(async (raffleId: number, quantity: number) => {
    if (!contract) {
      toast.error('Contract not initialized');
      return { success: false, txHash: null };
    }

    try {
      console.log('=== Contract buyTickets Call ===');
      console.log('Contract address:', contract.address);
      console.log('Raffle ID:', raffleId);
      console.log('Quantity:', quantity);
      
      // Get raffle info to calculate price
      const raffleInfo = await contract.raffles(raffleId);
      console.log('Raffle info from contract:', {
        name: raffleInfo.name,
        ticketPrice: ethers.utils.formatUnits(raffleInfo.ticketPrice, 6),
        ticketsSold: raffleInfo.ticketsSold.toString(),
        maxTickets: raffleInfo.maxTickets.toString(),
        isActive: raffleInfo.isActive,
      });
      
      const totalPrice = raffleInfo.ticketPrice.mul(quantity);
      console.log('Ticket price:', ethers.utils.formatUnits(raffleInfo.ticketPrice, 6), 'USDT');
      console.log('Total price:', ethers.utils.formatUnits(totalPrice, 6), 'USDT');

    // For USDT raffle, don't send ETH value - USDT is transferred via approve/transferFrom
    // Use aggressive gas limit for WalletConnect compatibility
    // Base: 500k + 100k per ticket, capped at 8M
    const gasLimit = ethers.BigNumber.from(Math.min(500000 + (quantity * 100000), 8000000));
    console.log('Using gas limit:', gasLimit.toString(), 'for', quantity, 'tickets');

    let tx;
    try {
      // Try with specified gas limit
      tx = await contract.buyTickets(raffleId, quantity, {
        gasLimit
      });
    } catch (gasError: any) {
      // If gas estimation fails (common on some mobile wallets), retry with higher manual gas limit
      if (gasError.message?.includes('cannot estimate gas') || 
          gasError.message?.includes('execution reverted') ||
          gasError.code === 'UNPREDICTABLE_GAS_LIMIT') {
        console.log('Gas estimation failed, retrying with increased manual gas limit');
        const safeGasLimit = ethers.BigNumber.from(Math.min(1000000 + (quantity * 150000), 10000000));
        console.log('Using safe gas limit:', safeGasLimit.toString());
        tx = await contract.buyTickets(raffleId, quantity, {
          gasLimit: safeGasLimit
        });
      } else {
        throw gasError;
      }
    }

    console.log('Transaction sent:', tx.hash);
      toast.loading('Purchasing tickets...', { id: 'buy-tickets' });
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      toast.success(`Successfully purchased ${quantity} ticket(s)!`, { id: 'buy-tickets' });
      
      // Send email confirmation
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          await supabase.functions.invoke('send-ticket-confirmation', {
            body: {
              email: user.email,
              raffleName: raffleInfo.name,
              quantity,
              totalPrice: ethers.utils.formatUnits(totalPrice, 6),
              txHash: receipt.transactionHash,
              walletAddress: account || 'Unknown'
            }
          });
          console.log('Confirmation email sent');
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the whole transaction if email fails
      }
      
      return { success: true, txHash: receipt.transactionHash };
    } catch (error: any) {
      console.error('Error buying tickets:', error);
      toast.error(error.reason || 'Failed to purchase tickets', { id: 'buy-tickets' });
      return { success: false, txHash: null };
    }
  }, [contract]);

  // Select winner (admin only)
  const selectWinner = useCallback(async (raffleId: number) => {
    if (!contract) {
      toast.error('Contract not initialized');
      return false;
    }

    try {
      console.log('=== Select Winner Call ===');
      console.log('Raffle ID:', raffleId);
      
      // Check raffle state on blockchain
      const raffleInfo = await contract.raffles(raffleId);
      console.log('Raffle info before selection:', {
        name: raffleInfo.name,
        ticketsSold: raffleInfo.ticketsSold.toString(),
        maxTickets: raffleInfo.maxTickets.toString(),
        isActive: raffleInfo.isActive,
        endTime: new Date(raffleInfo.endTime.toNumber() * 1000).toISOString(),
      });

      // Get entries for this raffle
      const entries = await contract.getRaffleEntries(raffleId);
      console.log('Total entries on blockchain:', entries.length);
      console.log('First 5 entries:', entries.slice(0, 5).map((e: any) => e.toString()));

      const tx = await contract.selectWinner(raffleId);

      console.log('VRF request transaction sent:', tx.hash);
      toast.loading('Requesting winner selection...', { id: 'select-winner' });
      await tx.wait();
      console.log('VRF request confirmed');

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

  // Get all raffle participants
  const getRaffleParticipants = useCallback(async (raffleId: number) => {
    if (!contract) return [];

    try {
      const participants = await contract.getRaffleParticipants(raffleId);
      return participants;
    } catch (error) {
      console.error('Error getting raffle participants:', error);
      return [];
    }
  }, [contract]);

  // Get raffle entries (all ticket entry IDs)
  const getRaffleEntries = useCallback(async (raffleId: number) => {
    if (!contract) return [];

    try {
      const entries = await contract.getRaffleEntries(raffleId);
      return entries.map((e: ethers.BigNumber) => e.toNumber());
    } catch (error) {
      console.error('Error getting raffle entries:', error);
      return [];
    }
  }, [contract]);

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
    getRaffleParticipants,
    getRaffleEntries,
    checkOwner,
    getRaffleCounter,
    getAllRafflesFromChain,
  };
};
