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
    rpcUrl: "https://cloudflare-eth.com",
    contractAddress: "0x61ae76814a9245abE8524f33f0F1B330124B4677",
  },
  sepolia: {
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
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

    console.log(`Connecting to ${network} at ${config.rpcUrl}`);

    // Use StaticJsonRpcProvider to skip network detection
    const networkConfig = {
      name: network,
      chainId: network === 'mainnet' ? 1 : 11155111
    };
    const provider = new ethers.providers.StaticJsonRpcProvider(config.rpcUrl, networkConfig);
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
      
      // Use a smaller, safer block range - last 2000 blocks
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 2000);
      
      console.log(`Querying events from block ${fromBlock} to ${currentBlock}`);
      
      const events = await contract.queryFilter(filter, fromBlock, 'latest');
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
    } catch (error) {
      console.error('Failed to scan blockchain events:', error);
      eventScanError = error instanceof Error ? error.message : 'Unknown error';
    }

    const message = eventScanError
      ? `Synced ${ticketsSold} tickets from blockchain. Note: Could not scan individual purchase events - ${eventScanError}. Ticket count updated but detailed records not created.`
      : `Synced ${ticketsSold} tickets from blockchain (${syncedTickets} new records created)`;

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
