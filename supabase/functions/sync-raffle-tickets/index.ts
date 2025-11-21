import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';
import { ethers } from 'https://esm.sh/ethers@5.7.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAFFLE_ABI = [
  "function raffles(uint256) view returns (string name, string description, uint256 ticketPrice, uint256 maxTickets, uint256 ticketsSold, uint256 endTime, address winner, bool isActive, bool vrfRequested, address nftContract)",
];

const NETWORK_CONFIGS = {
  mainnet: {
    rpcUrl: "https://eth.llamarpc.com",
    contractAddress: "0x61ae76814a9245abE8524f33f0F1B330124B4677",
  },
  sepolia: {
    rpcUrl: "https://rpc.ankr.com/eth_sepolia",
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
      .select('id, contract_raffle_id, network')
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

    // Connect to blockchain
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const contract = new ethers.Contract(config.contractAddress, RAFFLE_ABI, provider);

    // Fetch raffle data from contract
    console.log(`Fetching contract raffle ${raffle.contract_raffle_id}`);
    const contractRaffle = await contract.raffles(raffle.contract_raffle_id);

    const ticketsSold = contractRaffle.ticketsSold.toNumber();
    console.log(`Contract shows ${ticketsSold} tickets sold`);

    // Update database
    const { error: updateError } = await supabaseClient
      .from('raffles')
      .update({ tickets_sold: ticketsSold })
      .eq('id', raffleId);

    if (updateError) {
      throw new Error(`Failed to update raffle: ${updateError.message}`);
    }

    console.log(`Successfully synced raffle ${raffleId}: ${ticketsSold} tickets sold`);

    return new Response(
      JSON.stringify({
        success: true,
        raffleId,
        ticketsSold,
        message: `Synced ${ticketsSold} tickets from blockchain`,
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
