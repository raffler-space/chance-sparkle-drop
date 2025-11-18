import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Raffle {
  id: number
  name: string
  status: string | null
  draw_date: string | null
  tickets_sold: number | null
  max_tickets: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    console.log('Starting raffle status check...')

    // Get all active/live raffles where draw date has passed
    const { data: raffles, error: fetchError } = await supabaseClient
      .from('raffles')
      .select('id, name, status, draw_date, tickets_sold, max_tickets')
      .in('status', ['active', 'live'])
      .not('draw_date', 'is', null) as { data: Raffle[] | null, error: any }

    if (fetchError) {
      console.error('Error fetching raffles:', fetchError)
      throw fetchError
    }

    if (!raffles || raffles.length === 0) {
      console.log('No active raffles found')
      return new Response(
        JSON.stringify({ message: 'No active raffles to check' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const now = new Date()
    const rafflesToRefund: number[] = []

    // Check each raffle
    for (const raffle of raffles) {
      const drawDate = new Date(raffle.draw_date!)
      const ticketsSold = raffle.tickets_sold || 0
      const maxTickets = raffle.max_tickets
      const soldPercentage = (ticketsSold / maxTickets) * 100

      console.log(`Checking raffle ${raffle.id} (${raffle.name}):`, {
        drawDate: drawDate.toISOString(),
        now: now.toISOString(),
        ticketsSold,
        maxTickets,
        soldPercentage: soldPercentage.toFixed(2) + '%',
        drawDatePassed: drawDate < now,
        needsRefund: soldPercentage < 99
      })

      // If draw date has passed and less than 99% sold, mark for refunding
      if (drawDate < now && soldPercentage < 99) {
        rafflesToRefund.push(raffle.id)
        console.log(`Raffle ${raffle.id} (${raffle.name}) should be marked for refunding`)
      }
    }

    if (rafflesToRefund.length === 0) {
      console.log('No raffles need to be marked for refunding')
      return new Response(
        JSON.stringify({ message: 'No raffles require refunding at this time' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Update raffles to 'Refunding' status
    const { data: updatedRaffles, error: updateError } = await supabaseClient
      .from('raffles')
      .update({ status: 'Refunding' })
      .in('id', rafflesToRefund)
      .select()

    if (updateError) {
      console.error('Error updating raffle statuses:', updateError)
      throw updateError
    }

    console.log(`Successfully marked ${rafflesToRefund.length} raffles for refunding:`, rafflesToRefund)

    return new Response(
      JSON.stringify({
        message: `Marked ${rafflesToRefund.length} raffle(s) for refunding`,
        raffleIds: rafflesToRefund,
        updatedRaffles
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in check-raffle-status function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
