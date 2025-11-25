-- Fix Critical Security Issues

-- 1. Secure referral_earnings: Only allow system/trigger inserts
DROP POLICY IF EXISTS "System can insert earnings" ON public.referral_earnings;

CREATE POLICY "System can insert earnings" 
ON public.referral_earnings 
FOR INSERT 
WITH CHECK (false); -- Block all direct inserts, only triggers can insert

-- 2. Remove spoofable HTTP header-based policy from tickets
DROP POLICY IF EXISTS "Users can view tickets by wallet address" ON public.tickets;

-- 3. Secure referrals: Require authentication for inserts
DROP POLICY IF EXISTS "Anyone can insert referrals" ON public.referrals;

CREATE POLICY "Authenticated users can insert referrals" 
ON public.referrals 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = referred_id);

-- 4. Secure support_tickets: Require authentication for inserts
DROP POLICY IF EXISTS "Users can create tickets with wallet or auth" ON public.support_tickets;

CREATE POLICY "Authenticated users can create tickets" 
ON public.support_tickets 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);