-- Create referrals table to track who referred whom
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(referred_id)
);

-- Create referral earnings table to track commissions
CREATE TABLE public.referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  raffle_id integer NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  paid_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Anyone can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for referral earnings
CREATE POLICY "Users can view their own earnings"
  ON public.referral_earnings FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert earnings"
  ON public.referral_earnings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all earnings"
  ON public.referral_earnings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update earnings"
  ON public.referral_earnings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better query performance
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referral_earnings_referrer ON public.referral_earnings(referrer_id);
CREATE INDEX idx_referral_earnings_status ON public.referral_earnings(status);