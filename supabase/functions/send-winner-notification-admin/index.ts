import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

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

    // Find winner's user_id from tickets
    const { data: ticketData, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('user_id')
      .eq('raffle_id', raffleId)
      .eq('wallet_address', winnerAddress.toLowerCase())
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

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "Raffler <notifications@raffler.space>",
      to: [userData.user.email],
      subject: `🎉 Congratulations! You Won ${raffleData.name}`,
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
                  <p style="font-size: 18px; margin: 10px 0;"><strong>${raffleData.name}</strong></p>
                  <p>${raffleData.prize_description}</p>
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
