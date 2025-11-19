import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { loadEmailTemplate, renderTemplate } from "../_shared/emailTemplates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { email, raffleName, prizeDescription, deliveryInfo }: PrizeClaimRequest = await req.json();

    console.log('Sending prize claim confirmation to:', email);

    // Load template from database
    const template = await loadEmailTemplate('prize_claim_confirmation');
    if (!template) {
      throw new Error('Email template not found');
    }

    // Prepare variables
    const variables = {
      raffleName,
      prizeDescription,
      deliveryInfo: deliveryInfo.replace(/\n/g, '<br>'),
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
