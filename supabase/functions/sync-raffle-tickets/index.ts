import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';
import { ethers } from 'https://esm.sh/ethers@5.7.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAFFLE_ABI = [
  "function raffles(uint256) view returns (string name, string description, uint256 ticketPrice, uint256 maxTickets, uint256 ticketsSold, uint256 endTime, address winner, bool isActive, bool vrfRequested, address nftContract)",
  "event TicketPurchased(uint256 indexed raffleId, address indexed buyer, uint256 ticketNumber, uint256 price)"
];

// Generate a deterministic UUID from wallet address
function generateUserIdFromWallet(walletAddress: string): string {
  // Use ethers.utils.keccak256 to create a deterministic hash
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(walletAddress.toLowerCase()));
  // Convert first 16 bytes to UUID format
  const uuid = `${hash.slice(2, 10)}-${hash.slice(10, 14)}-${hash.slice(14, 18)}-${hash.slice(18, 22)}-${hash.slice(22, 34)}`;
  return uuid;
}

const NETWORK_CONFIGS = {
  mainnet: {
    getRpcUrl: () => {
      const alchemyKey = Deno.env.get('ALCHEMY_API_KEY');
      return alchemyKey 
        ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
        : "https://ethereum-rpc.publicnode.com";
    },
    contractAddress: "0x61ae76814a9245abE8524f33f0F1B330124B4677",
  },
  sepolia: {
    getRpcUrl: () => {
      const alchemyKey = Deno.env.get('ALCHEMY_API_KEY');
      return alchemyKey 
        ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
        : "https://ethereum-sepolia-rpc.publicnode.com";
    },
    contractAddress: "0x2Fc185b0dBD4C3695F607c2Ecb73726B5eed92F8",
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      throw new Error('Unauthorized - Admin access required');
    }

    const { raffleId } = await req.json();

    if (!raffleId) {
      throw new Error('Raffle ID is required');
    }

    console.log(`Syncing tickets for raffle ID: ${raffleId}`);

    // Fetch raffle from database
    const { data: raffle, error: raffleError } = await supabaseClient
      .from('raffles')
      .select('id, contract_raffle_id, network, created_at')
      .eq('id', raffleId)
      .single();

    if (raffleError || !raffle) {
      throw new Error(`Raffle not found: ${raffleError?.message}`);
    }

    if (!raffle.contract_raffle_id && raffle.contract_raffle_id !== 0) {
      throw new Error('Raffle does not have a contract raffle ID');
    }

    const network = raffle.network || 'mainnet';
    const config = NETWORK_CONFIGS[network as keyof typeof NETWORK_CONFIGS];

    if (!config) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const rpcUrl = config.getRpcUrl();
    console.log(`Connecting to ${network} at ${rpcUrl.includes('alchemy') ? 'Alchemy' : rpcUrl}`);

    // Use StaticJsonRpcProvider to skip network detection
    const networkConfig = {
      name: network,
      chainId: network === 'mainnet' ? 1 : 11155111
    };
    const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl, networkConfig);
    const contract = new ethers.Contract(config.contractAddress, RAFFLE_ABI, provider);

    // Fetch raffle data from contract
    console.log(`Fetching contract raffle ${raffle.contract_raffle_id}`);
    const contractRaffle = await contract.raffles(raffle.contract_raffle_id);

    const ticketsSold = contractRaffle.ticketsSold.toNumber();
    console.log(`Contract shows ${ticketsSold} tickets sold`);

    // Update raffle tickets_sold count first
    const { error: updateError } = await supabaseClient
      .from('raffles')
      .update({ tickets_sold: ticketsSold })
      .eq('id', raffleId);

    if (updateError) {
      throw new Error(`Failed to update raffle: ${updateError.message}`);
    }

    // Try to fetch TicketPurchased events for this raffle
    let syncedTickets = 0;
    let eventScanError = null;
    
    try {
      console.log(`Scanning blockchain for TicketPurchased events...`);
      const filter = contract.filters.TicketPurchased(raffle.contract_raffle_id);
      
      // Calculate starting block based on raffle creation time
      const currentBlock = await provider.getBlockNumber();
      const raffleCreatedAt = new Date(raffle.created_at).getTime();
      const currentTime = Date.now();
      const timeDiffSeconds = (currentTime - raffleCreatedAt) / 1000;
      const avgBlockTime = 12; // Ethereum average block time
      const estimatedBlocksSinceCreation = Math.ceil(timeDiffSeconds / avgBlockTime);
      
      // Go back 20% more blocks to be safe, and ensure minimum range
      const blocksToScan = Math.max(estimatedBlocksSinceCreation * 1.2, 10000);
      const fromBlock = Math.max(0, currentBlock - Math.floor(blocksToScan));
      
      console.log(`Querying events from block ${fromBlock} to ${currentBlock} (scanning ~${Math.floor(blocksToScan)} blocks)`);
      
      // Query in chunks to work with Alchemy Free tier (10 block limit) and other RPC limits
      const CHUNK_SIZE = 2000; // Use 2000 blocks per chunk for efficiency
      const allEvents = [];
      
      for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
        const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);
        console.log(`  Scanning chunk: blocks ${start} to ${end}`);
        
        try {
          const chunkEvents = await contract.queryFilter(filter, start, end);
          allEvents.push(...chunkEvents);
          console.log(`  Found ${chunkEvents.length} events in this chunk`);
        } catch (chunkError) {
          console.error(`  Error scanning chunk ${start}-${end}:`, chunkError);
          // Continue with next chunk even if one fails
        }
      }
      
      const events = allEvents;
      console.log(`Found ${events.length} ticket purchase events`);

      // Process each event and create/update ticket records
      for (const event of events) {
        const { buyer, ticketNumber, price } = event.args!;
        const txHash = event.transactionHash;
        
        // Generate deterministic user_id from wallet address
        const userId = generateUserIdFromWallet(buyer);
        
        // Check if ticket already exists
        const { data: existingTicket } = await supabaseClient
          .from('tickets')
          .select('id')
          .eq('raffle_id', raffleId)
          .eq('ticket_number', ticketNumber.toNumber())
          .eq('tx_hash', txHash)
          .maybeSingle();

        if (!existingTicket) {
          // Convert price from wei to USDT (assuming 6 decimals for USDT)
          const priceInUsdt = parseFloat(ethers.utils.formatUnits(price, 6));
          
          // Get block timestamp for purchased_at
          const block = await provider.getBlock(event.blockNumber);
          
          const { error: insertError } = await supabaseClient
            .from('tickets')
            .insert({
              user_id: userId,
              wallet_address: buyer,
              raffle_id: raffleId,
              ticket_number: ticketNumber.toNumber(),
              tx_hash: txHash,
              purchase_price: priceInUsdt,
              quantity: 1,
              purchased_at: new Date(block.timestamp * 1000).toISOString()
            });

          if (insertError) {
            console.error(`Failed to insert ticket ${ticketNumber}: ${insertError.message}`);
          } else {
            syncedTickets++;
          }
        }
      }

      // After creating all tickets, automatically create refund records
      if (syncedTickets > 0 || events.length > 0) {
        console.log('Creating refund records from synced tickets...');
        
        // Group tickets by wallet address and sum amounts
        const walletRefunds: Record<string, { userId: string; amount: number }> = {};
        
        for (const event of events) {
          const { buyer, price } = event.args!;
          const priceInUsdt = parseFloat(ethers.utils.formatUnits(price, 6));
          const userId = generateUserIdFromWallet(buyer);
          
          if (!walletRefunds[buyer]) {
            walletRefunds[buyer] = { userId, amount: 0 };
          }
          walletRefunds[buyer].amount += priceInUsdt;
        }

        // Create refund records
        const refundRecords = Object.entries(walletRefunds).map(([wallet, data]) => ({
          raffle_id: raffleId,
          user_id: data.userId,
          wallet_address: wallet,
          amount: data.amount,
          status: 'pending'
        }));

        if (refundRecords.length > 0) {
          // Check for existing refunds
          const { data: existingRefunds } = await supabaseClient
            .from('refunds')
            .select('wallet_address')
            .eq('raffle_id', raffleId);

          const existingWallets = new Set(existingRefunds?.map(r => r.wallet_address) || []);
          const newRefundRecords = refundRecords.filter(r => !existingWallets.has(r.wallet_address));

          if (newRefundRecords.length > 0) {
            const { error: refundError } = await supabaseClient
              .from('refunds')
              .insert(newRefundRecords);

            if (refundError) {
              console.error('Failed to create refund records:', refundError.message);
            } else {
              console.log(`Created ${newRefundRecords.length} refund records`);
            }
          } else {
            console.log('All refund records already exist');
          }
        }
      }
    } catch (error) {
      console.error('Failed to scan blockchain events:', error);
      eventScanError = error instanceof Error ? error.message : 'Unknown error';
    }

    const message = eventScanError
      ? `Synced ${ticketsSold} tickets from blockchain. Note: Could not scan individual purchase events - ${eventScanError}. Ticket count updated but detailed records not created.`
      : `Synced ${ticketsSold} tickets from blockchain (${syncedTickets} new records created). Refund records initialized and ready for processing.`;

    console.log(`Successfully synced raffle ${raffleId}: ${message}`);

    return new Response(
      JSON.stringify({
        success: true,
        raffleId,
        ticketsSold,
        ticketRecordsCreated: syncedTickets,
        eventScanError,
        message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error syncing raffle tickets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
