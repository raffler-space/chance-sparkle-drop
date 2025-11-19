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

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Input validation schema
const prizeClaimSchema = z.object({
  email: z.string().email().max(255),
  raffleName: z.string().trim().min(1).max(200),
  prizeDescription: z.string().trim().min(1).max(500),
  deliveryInfo: z.string().trim().min(1).max(1000),
});

interface PrizeClaimRequest {
  email: string;
  raffleName: string;
  prizeDescription: string;
  deliveryInfo: string;
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
    const validationResult = prizeClaimSchema.safeParse(body);
    
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

    const { email, raffleName, prizeDescription, deliveryInfo } = validationResult.data;

    console.log('Sending prize claim confirmation to:', email);

    // Load template from database
    const template = await loadEmailTemplate('prize_claim_confirmation');
    if (!template) {
      throw new Error('Email template not found');
    }

    // Prepare variables with HTML escaping for user-provided content
    const variables = {
      raffleName,
      prizeDescription,
      deliveryInfo: escapeHtml(deliveryInfo).replace(/\n/g, '<br>'),
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

    console.log("Prize claim confirmation email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending prize claim confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
