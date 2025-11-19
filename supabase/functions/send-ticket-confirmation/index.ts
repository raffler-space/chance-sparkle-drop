import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { email, raffleName, quantity, totalPrice, txHash, walletAddress }: TicketConfirmationRequest = await req.json();

    console.log('Sending ticket confirmation to:', email);

    const emailResponse = await resend.emails.send({
      from: "Raffler <notifications@raffler.space>",
      to: [email],
      subject: `Ticket Purchase Confirmation - ${raffleName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .info-label { font-weight: 600; color: #666; }
              .info-value { color: #333; }
              .tx-hash { word-break: break-all; font-size: 12px; color: #667eea; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎟️ Ticket Purchase Confirmed!</h1>
              </div>
              <div class="content">
                <p>Thank you for your purchase! Your tickets have been successfully recorded on the blockchain.</p>
                
                <div class="ticket-info">
                  <div class="info-row">
                    <span class="info-label">Raffle:</span>
                    <span class="info-value">${raffleName}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Tickets Purchased:</span>
                    <span class="info-value">${quantity}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Total Amount:</span>
                    <span class="info-value">${totalPrice} USDT</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Wallet:</span>
                    <span class="info-value">${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Transaction:</span>
                    <span class="info-value tx-hash">${txHash}</span>
                  </div>
                </div>

                <p>Your tickets are now active and entered into the raffle. Good luck!</p>
                
                <center>
                  <a href="https://raffler.space/dashboard" class="button">View My Tickets</a>
                </center>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Raffler. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `,
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
