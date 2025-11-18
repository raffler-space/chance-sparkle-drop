import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const trackReferralSchema = z.object({
  referralCode: z.string().min(1).max(50),
  userId: z.string().uuid(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create authenticated client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validationResult = trackReferralSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { referralCode, userId } = validationResult.data;

    // SECURITY: Verify the userId matches the authenticated user
    if (userId !== user.id) {
      console.error('User ID mismatch:', { providedUserId: userId, authenticatedUserId: user.id });
      return new Response(
        JSON.stringify({ error: 'Forbidden: Cannot create referral for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client only after authentication/authorization checks
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the referrer by referral code
    const { data: existingReferrals, error: searchError } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id')
      .eq('referral_code', referralCode)
      .limit(1);

    if (!existingReferrals || existingReferrals.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referrerId = existingReferrals[0].referrer_id;

    // Prevent self-referral
    if (referrerId === userId) {
      return new Response(
        JSON.stringify({ error: 'Cannot refer yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this user was already referred
    const { data: existingReferral, error: checkError } = await supabaseAdmin
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
    const { error: insertError } = await supabaseAdmin
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

    console.log('Referral tracked successfully for user:', userId);

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
