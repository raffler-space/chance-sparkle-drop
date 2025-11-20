import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0'
import { ethers } from 'https://esm.sh/ethers@5.7.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Network configurations
const NETWORKS = {
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    contractAddress: '0x61ae76814a9245abE8524f33f0F1B330124B4677',
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://rpc.ankr.com/eth_sepolia',
    contractAddress: '0x2Fc185b0dBD4C3695F607c2Ecb73726B5eed92F8',
  },
}

const RAFFLE_ABI = [
  'function raffles(uint256) view returns (string name, string description, uint256 ticketPrice, uint256 maxTickets, uint256 ticketsSold, uint256 endTime, address winner, bool isActive, bool vrfRequested, address nftContract)',
]

interface Raffle {
  id: number
  contract_raffle_id: number | null
  tickets_sold: number | null
  status: string | null
  winner_address: string | null
  name: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify cron secret
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const providedSecret = req.headers.get('x-cron-secret')
    if (providedSecret !== cronSecret) {
      console.error('Unauthorized - invalid cron secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('Starting raffle state sync from blockchain...')

    // Get all raffles with contract IDs (active, drawing, or completed)
    const { data: raffles, error: fetchError } = await supabaseClient
      .from('raffles')
      .select('id, contract_raffle_id, tickets_sold, status, winner_address, name')
      .not('contract_raffle_id', 'is', null)
      .in('status', ['active', 'drawing', 'completed']) as { data: Raffle[] | null; error: any }

    if (fetchError) {
      console.error('Error fetching raffles:', fetchError)
      throw fetchError
    }

    if (!raffles || raffles.length === 0) {
      console.log('No raffles to sync')
      return new Response(
        JSON.stringify({ message: 'No raffles to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Found ${raffles.length} raffles to sync`)

    const updates: Array<{ id: number; tickets_sold: number; winner?: string; status?: string }> = []

    // Create providers for both networks
    const mainnetProvider = new ethers.providers.JsonRpcProvider(NETWORKS.mainnet.rpcUrl)
    const sepoliaProvider = new ethers.providers.JsonRpcProvider(NETWORKS.sepolia.rpcUrl)

    const mainnetContract = new ethers.Contract(
      NETWORKS.mainnet.contractAddress,
      RAFFLE_ABI,
      mainnetProvider
    )
    const sepoliaContract = new ethers.Contract(
      NETWORKS.sepolia.contractAddress,
      RAFFLE_ABI,
      sepoliaProvider
    )

    // Process each raffle
    for (const raffle of raffles) {
      try {
        console.log(`Syncing raffle ${raffle.id} (contract ID: ${raffle.contract_raffle_id})`)

        // Try Sepolia first (testnet), then mainnet
        let contractInfo
        let networkUsed = ''

        try {
          contractInfo = await sepoliaContract.raffles(raffle.contract_raffle_id)
          networkUsed = 'Sepolia'
        } catch (sepoliaError) {
          console.log(`Not found on Sepolia, trying Mainnet...`)
          try {
            contractInfo = await mainnetContract.raffles(raffle.contract_raffle_id)
            networkUsed = 'Mainnet'
          } catch (mainnetError) {
            console.error(`Failed to fetch from both networks for raffle ${raffle.id}:`, mainnetError)
            continue
          }
        }

        const [name, description, ticketPrice, maxTickets, ticketsSold, endTime, winner, isActive, vrfRequested, nftContract] = contractInfo

        console.log(`Raffle ${raffle.id} on ${networkUsed}:`, {
          name,
          ticketsSold: ticketsSold.toNumber(),
          winner,
          isActive,
          vrfRequested,
        })

        const onChainTicketsSold = ticketsSold.toNumber()
        const onChainWinner = winner

        // Prepare update object
        const update: any = {
          id: raffle.id,
          tickets_sold: onChainTicketsSold,
        }

        // Check if winner has been selected on-chain
        if (onChainWinner && onChainWinner !== ethers.constants.AddressZero) {
          if (!raffle.winner_address || raffle.winner_address !== onChainWinner) {
            console.log(`Winner detected on-chain for raffle ${raffle.id}: ${onChainWinner}`)
            update.winner_address = onChainWinner
            if (raffle.status === 'drawing') {
              update.status = 'completed'
              update.completed_at = new Date().toISOString()
            }
          }
        }

        // Only update if there are changes
        if (
          raffle.tickets_sold !== onChainTicketsSold ||
          (update.winner_address && update.winner_address !== raffle.winner_address) ||
          (update.status && update.status !== raffle.status)
        ) {
          updates.push(update)
        }
      } catch (error) {
        console.error(`Error syncing raffle ${raffle.id}:`, error)
      }
    }

    // Perform batch update
    if (updates.length > 0) {
      console.log(`Updating ${updates.length} raffles with synced data`)
      
      for (const update of updates) {
        const { error: updateError } = await supabaseClient
          .from('raffles')
          .update(update)
          .eq('id', update.id)

        if (updateError) {
          console.error(`Error updating raffle ${update.id}:`, updateError)
        } else {
          console.log(`Successfully updated raffle ${update.id}`)
        }
      }

      return new Response(
        JSON.stringify({
          message: `Successfully synced ${updates.length} raffles`,
          updates,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      console.log('All raffles are already in sync')
      return new Response(
        JSON.stringify({ message: 'All raffles are already in sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
  } catch (error) {
    console.error('Error in sync-raffle-state function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
