-- Create email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  description TEXT,
  variables TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admin can read all templates
CREATE POLICY "Admins can view email templates"
ON public.email_templates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admin can update templates
CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_site_content_timestamp();

-- Insert default email templates
INSERT INTO public.email_templates (template_key, template_name, subject, html_content, description, variables) VALUES
('ticket_confirmation', 'Ticket Purchase Confirmation', 'Ticket Purchase Confirmation - {{raffleName}}', 
'<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', ''Roboto'', sans-serif; line-height: 1.6; color: #333; }
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
            <span class="info-value">{{raffleName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tickets Purchased:</span>
            <span class="info-value">{{quantity}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total Amount:</span>
            <span class="info-value">{{totalPrice}} USDT</span>
          </div>
          <div class="info-row">
            <span class="info-label">Wallet:</span>
            <span class="info-value">{{walletAddressShort}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Transaction:</span>
            <span class="info-value tx-hash">{{txHash}}</span>
          </div>
        </div>

        <p>Your tickets are now active and entered into the raffle. Good luck!</p>
        
        <center>
          <a href="https://raffler.space/dashboard" class="button">View My Tickets</a>
        </center>
      </div>
      <div class="footer">
        <p>© {{year}} Raffler. All rights reserved.</p>
        <p>This is an automated message, please do not reply.</p>
      </div>
    </div>
  </body>
</html>',
'Sent after a user purchases tickets',
ARRAY['raffleName', 'quantity', 'totalPrice', 'walletAddressShort', 'txHash', 'year']),

('winner_notification', 'Winner Notification', '🎉 Congratulations! You Won {{raffleName}}',
'<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', ''Roboto'', sans-serif; line-height: 1.6; color: #333; }
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
        <h1>YOU''RE A WINNER!</h1>
        <p style="font-size: 18px; margin-top: 10px;">Congratulations on your amazing win!</p>
      </div>
      <div class="content">
        <p style="font-size: 18px;"><strong>Great news!</strong> Your ticket has been selected as the winner!</p>
        
        <div class="prize-box">
          <div class="prize-title">🏆 Your Prize</div>
          <p style="font-size: 18px; margin: 10px 0;"><strong>{{raffleName}}</strong></p>
          <p>{{prizeDescription}}</p>
        </div>

        <div class="info-row">
          <span class="info-label">Winning Wallet:</span><br/>
          <span style="color: #333;">{{winnerAddress}}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">Draw Transaction:</span>
          <div class="tx-hash">{{drawTxHash}}</div>
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
        <p>© {{year}} Raffler. All rights reserved.</p>
        <p>This is an automated message, please do not reply.</p>
      </div>
    </div>
  </body>
</html>',
'Sent when a user wins a raffle',
ARRAY['raffleName', 'prizeDescription', 'winnerAddress', 'drawTxHash', 'year']),

('prize_claim_confirmation', 'Prize Claim Confirmation', 'Prize Claim Received - {{raffleName}}',
'<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', ''Roboto'', sans-serif; line-height: 1.6; color: #333; }
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
            <div class="info-value">{{raffleName}}</div>
          </div>
          <div class="info-section">
            <div class="info-label">Prize:</div>
            <div class="info-value">{{prizeDescription}}</div>
          </div>
          <div class="info-section">
            <div class="info-label">Delivery Information:</div>
            <div class="info-value">{{deliveryInfo}}</div>
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
          <strong>📧 Stay Updated:</strong> We''ll send you email updates as your prize moves through each stage of processing and delivery.
        </p>
      </div>
      <div class="footer">
        <p>© {{year}} Raffler. All rights reserved.</p>
        <p>Questions? Contact us at support@raffler.space</p>
      </div>
    </div>
  </body>
</html>',
'Sent when a winner submits prize claim information',
ARRAY['raffleName', 'prizeDescription', 'deliveryInfo', 'year']);
