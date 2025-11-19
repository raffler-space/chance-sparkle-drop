import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

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

    const emailResponse = await resend.emails.send({
      from: "Raffler <notifications@raffler.space>",
      to: [email],
      subject: `Prize Claim Received - ${raffleName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .status-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .prize-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .info-section { margin: 15px 0; }
              .info-label { font-weight: 600; color: #666; margin-bottom: 5px; }
              .info-value { color: #333; background: #f8f9fa; padding: 10px; border-radius: 4px; }
              .timeline { margin: 20px 0; padding: 20px; background: white; border-radius: 8px; }
              .timeline-item { padding: 10px 0; border-left: 3px solid #667eea; padding-left: 15px; margin-left: 10px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Prize Claim Received</h1>
              </div>
              <div class="content">
                <div class="status-box">
                  <h2 style="margin: 0; color: #155724;">Claim Successfully Submitted!</h2>
                  <p style="margin: 10px 0 0 0;">Our team has received your prize claim request and will process it shortly.</p>
                </div>

                <div class="prize-info">
                  <h3 style="margin-top: 0;">Prize Details</h3>
                  <div class="info-section">
                    <div class="info-label">Raffle:</div>
                    <div class="info-value">${raffleName}</div>
                  </div>
                  <div class="info-section">
                    <div class="info-label">Prize:</div>
                    <div class="info-value">${prizeDescription}</div>
                  </div>
                  <div class="info-section">
                    <div class="info-label">Delivery Information:</div>
                    <div class="info-value">${deliveryInfo.replace(/\n/g, '<br>')}</div>
                  </div>
                </div>

                <div class="timeline">
                  <h3 style="margin-top: 0;">What Happens Next?</h3>
                  <div class="timeline-item">
                    <strong>Step 1:</strong> Claim verification (24-48 hours)
                  </div>
                  <div class="timeline-item">
                    <strong>Step 2:</strong> Prize preparation & shipping
                  </div>
                  <div class="timeline-item">
                    <strong>Step 3:</strong> Tracking information sent to you
                  </div>
                  <div class="timeline-item">
                    <strong>Step 4:</strong> Prize delivered!
                  </div>
                </div>

                <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 6px;">
                  <strong>📧 Stay Updated:</strong> We'll send you email updates as your prize moves through each stage of processing and delivery.
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Raffler. All rights reserved.</p>
                <p>Questions? Contact us at support@raffler.space</p>
              </div>
            </div>
          </body>
        </html>
      `,
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
