import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { loadEmailTemplate, renderTemplate } from "../_shared/emailTemplates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const ticketConfirmationSchema = z.object({
  email: z.string().email().max(255),
  raffleName: z.string().trim().min(1).max(200),
  quantity: z.number().int().positive().max(1000),
  totalPrice: z.string().regex(/^\d+(\.\d{1,18})?$/),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

interface TicketConfirmationRequest {
  email: string;
  raffleName: string;
  quantity: number;
  totalPrice: string;
  txHash: string;
  walletAddress: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validationResult = ticketConfirmationSchema.safeParse(body);
    
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

    const { email, raffleName, quantity, totalPrice, txHash, walletAddress } = validationResult.data;

    // Verify the wallet address belongs to the authenticated user
    const { data: userTickets, error: ticketError } = await supabaseClient
      .from('tickets')
      .select('id')
      .eq('tx_hash', txHash)
      .eq('user_id', user.id)
      .single();

    if (ticketError || !userTickets) {
      console.error('Ticket verification failed:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Cannot send confirmation for tickets you do not own' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending ticket confirmation to:', email);

    // Load template from database
    const template = await loadEmailTemplate('ticket_confirmation');
    if (!template) {
      throw new Error('Email template not found');
    }

    // Prepare variables
    const variables = {
      raffleName,
      quantity: quantity.toString(),
      totalPrice,
      walletAddressShort: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      txHash,
      year: new Date().getFullYear().toString()
    };

    // Render template
    const { subject, html } = renderTemplate(template, variables);

    const emailResponse = await resend.emails.send({
      from: "Raffler <notifications@raffler.space>",
      to: [email],
      subject,
      html,
    });

    console.log("Ticket confirmation email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending ticket confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
