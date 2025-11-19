import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const winnerNotificationSchema = z.object({
  email: z.string().email().max(255),
  winnerName: z.string().trim().min(1).max(200),
  raffleName: z.string().trim().min(1).max(200),
  prizeDescription: z.string().trim().min(1).max(500),
  drawDate: z.string(),
  contactEmail: z.string().email().max(255),
});

interface WinnerNotificationRequest {
  email: string;
  raffleName: string;
  prizeDescription: string;
  winnerAddress: string;
  drawTxHash: string;
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

    // Parse request body
    const body = await req.json();
    
    // Support both old and new formats
    let email, raffleName, prizeDescription, winnerAddress, drawTxHash;
    
    if ('winnerName' in body) {
      // New format - validate with schema
      const validationResult = winnerNotificationSchema.safeParse(body);
      
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
      
      const data = validationResult.data;
      email = data.email;
      raffleName = data.raffleName;
      prizeDescription = data.prizeDescription;
      winnerAddress = undefined;
      drawTxHash = undefined;
    } else {
      // Old format - for backward compatibility
      email = body.email;
      raffleName = body.raffleName;
      prizeDescription = body.prizeDescription;
      winnerAddress = body.winnerAddress;
      drawTxHash = body.drawTxHash;
    }

    console.log('Sending winner notification to:', email);

    const emailResponse = await resend.emails.send({
      from: "Raffler <notifications@raffler.space>",
      to: [email],
      subject: `🎉 Congratulations! You Won ${raffleName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { font-size: 32px; margin: 0; }
              .confetti { font-size: 48px; margin: 20px 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .prize-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border: 2px solid #f5576c; }
              .prize-title { font-size: 24px; color: #f5576c; margin-bottom: 10px; }
              .info-row { padding: 10px 0; }
              .info-label { font-weight: 600; color: #666; }
              .tx-hash { word-break: break-all; font-size: 12px; color: #667eea; margin-top: 5px; }
              .button { display: inline-block; background: #f5576c; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; font-size: 16px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="confetti">🎊 🎉 🎊</div>
                <h1>YOU'RE A WINNER!</h1>
                <p style="font-size: 18px; margin-top: 10px;">Congratulations on your amazing win!</p>
              </div>
              <div class="content">
                <p style="font-size: 18px;"><strong>Great news!</strong> Your ticket has been selected as the winner!</p>
                
                <div class="prize-box">
                  <div class="prize-title">🏆 Your Prize</div>
                  <p style="font-size: 18px; margin: 10px 0;"><strong>${raffleName}</strong></p>
                  <p>${prizeDescription}</p>
                </div>

                <div class="info-row">
                  <span class="info-label">Winning Wallet:</span><br/>
                  <span style="color: #333;">${winnerAddress}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Draw Transaction:</span>
                  <div class="tx-hash">${drawTxHash}</div>
                </div>

                <div class="warning">
                  <strong>⚠️ Next Steps:</strong>
                  <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Log into your Raffler account</li>
                    <li>Go to your Dashboard</li>
                    <li>Click "Claim Prize" on your winning raffle</li>
                    <li>Provide your delivery information</li>
                  </ol>
                </div>

                <center>
                  <a href="https://raffler.space/dashboard" class="button">Claim Your Prize Now</a>
                </center>

                <p style="margin-top: 30px; text-align: center; color: #666;">
                  This win has been verified on the blockchain and is 100% legitimate.
                </p>
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

    console.log("Winner notification email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
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
