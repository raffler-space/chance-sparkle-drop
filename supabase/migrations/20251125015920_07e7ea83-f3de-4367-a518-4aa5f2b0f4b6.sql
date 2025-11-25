-- Update RLS policies for tickets to support wallet-based purchases without authentication

-- Drop existing insert policy
DROP POLICY IF EXISTS "Authenticated users can insert their own tickets" ON public.tickets;

-- Create new insert policy that allows both authenticated and wallet-based inserts
CREATE POLICY "Users can insert tickets with wallet or auth"
ON public.tickets
FOR INSERT
WITH CHECK (
  -- Either authenticated and user_id matches
  (auth.uid() = user_id)
  OR
  -- Or wallet address is provided (for unauthenticated web3 users)
  (wallet_address IS NOT NULL AND wallet_address != '')
);

-- Add policy to allow users to view tickets by wallet address
CREATE POLICY "Users can view tickets by wallet address"
ON public.tickets
FOR SELECT
USING (
  -- User's connected wallet can view their tickets
  wallet_address = current_setting('request.headers', true)::json->>'x-wallet-address'
  OR
  -- Or if authenticated, can view by user_id
  auth.uid() = user_id
);