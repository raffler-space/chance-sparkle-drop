import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { referralCode, userId } = await req.json();

    if (!referralCode || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing referral code or user ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the referrer by referral code
    const { data: existingReferrals, error: searchError } = await supabase
      .from('referrals')
      .select('referrer_id')
      .eq('referral_code', referralCode)
      .limit(1);

    if (searchError) {
      console.error('Error searching for referrer:', searchError);
      return new Response(
        JSON.stringify({ error: 'Failed to find referrer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingReferrals || existingReferrals.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referrerId = existingReferrals[0].referrer_id;

    // Check if this user was already referred
    const { data: existingReferral, error: checkError } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing referral:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check referral status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingReferral) {
      return new Response(
        JSON.stringify({ error: 'User already has a referrer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the referral relationship
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_id: userId,
        referral_code: referralCode
      });

    if (insertError) {
      console.error('Error creating referral:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create referral' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Referral tracked successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in track-referral function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
