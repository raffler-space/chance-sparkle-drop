import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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
    // Verify cron secret to prevent unauthorized access
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const providedSecret = req.headers.get('x-cron-secret');
    
    if (providedSecret !== cronSecret) {
      console.error('Unauthorized access attempt - invalid cron secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

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
    const rafflesToComplete: number[] = []

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
        shouldComplete: soldPercentage >= 99,
        shouldRefund: soldPercentage < 99
      })

      // If draw date has passed
      if (drawDate < now) {
        if (soldPercentage >= 99) {
          // Mark for completion
          rafflesToComplete.push(raffle.id)
          console.log(`Raffle ${raffle.id} (${raffle.name}) should be marked as completed`)
        } else {
          // Mark for refunding
          rafflesToRefund.push(raffle.id)
          console.log(`Raffle ${raffle.id} (${raffle.name}) should be marked for refunding`)
        }
      }
    }

    const updates: any[] = []

    // Update raffles to 'completed' status
    if (rafflesToComplete.length > 0) {
      const { data: completedRaffles, error: completeError } = await supabaseClient
        .from('raffles')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .in('id', rafflesToComplete)
        .select()

      if (completeError) {
        console.error('Error updating raffle statuses to completed:', completeError)
        throw completeError
      }

      console.log(`Successfully marked ${rafflesToComplete.length} raffles as completed:`, rafflesToComplete)
      updates.push({ action: 'completed', count: rafflesToComplete.length, raffleIds: rafflesToComplete })
    }

    // Update raffles to 'Refunding' status
    if (rafflesToRefund.length > 0) {
      const { data: refundingRaffles, error: refundError } = await supabaseClient
        .from('raffles')
        .update({ status: 'Refunding' })
        .in('id', rafflesToRefund)
        .select()

      if (refundError) {
        console.error('Error updating raffle statuses to refunding:', refundError)
        throw refundError
      }

      console.log(`Successfully marked ${rafflesToRefund.length} raffles for refunding:`, rafflesToRefund)
      updates.push({ action: 'refunding', count: rafflesToRefund.length, raffleIds: rafflesToRefund })
    }

    if (updates.length === 0) {
      console.log('No raffles need status updates')
      return new Response(
        JSON.stringify({ message: 'No raffles require status updates at this time' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({
        message: `Updated ${updates.reduce((sum, u) => sum + u.count, 0)} raffle(s)`,
        updates
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
