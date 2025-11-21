import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { loadEmailTemplate, renderTemplate } from "../_shared/emailTemplates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WinnerNotificationAdminRequest {
  raffleId: number;
  winnerAddress: string;
  drawTxHash: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user has admin role
    const { data: hasAdminRole } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { raffleId, winnerAddress, drawTxHash }: WinnerNotificationAdminRequest = await req.json();

    console.log('Sending winner notification for raffle:', raffleId);

    // Get raffle details
    const { data: raffleData, error: raffleError } = await supabaseAdmin
      .from('raffles')
      .select('name, prize_description')
      .eq('id', raffleId)
      .single();

    if (raffleError || !raffleData) {
      console.error('Error fetching raffle:', raffleError);
      return new Response(JSON.stringify({ error: 'Raffle not found' }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Find winner's user_id from tickets (case-insensitive wallet address match)
    const { data: ticketData, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('user_id')
      .eq('raffle_id', raffleId)
      .ilike('wallet_address', winnerAddress)
      .limit(1)
      .maybeSingle();

    if (ticketError || !ticketData) {
      console.error('Error fetching ticket:', ticketError);
      return new Response(JSON.stringify({ error: 'Winner ticket not found' }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get winner's email from auth.users using service role
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      ticketData.user_id
    );

    if (userError || !userData.user?.email) {
      console.error('Error fetching user email:', userError);
      return new Response(JSON.stringify({ error: 'Winner email not found' }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Load email template
    const template = await loadEmailTemplate('winner_notification');
    if (!template) {
      throw new Error('Email template not found');
    }

    // Prepare variables
    const variables = {
      raffleName: raffleData.name,
      prizeDescription: raffleData.prize_description,
      winnerAddress,
      drawTxHash,
      year: new Date().getFullYear().toString()
    };

    // Render template
    const { subject, html } = renderTemplate(template, variables);

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "Raffler <notifications@raffler.space>",
      to: [userData.user.email],
      subject,
      html,
    });

    console.log("Winner notification email sent successfully");

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending winner notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
