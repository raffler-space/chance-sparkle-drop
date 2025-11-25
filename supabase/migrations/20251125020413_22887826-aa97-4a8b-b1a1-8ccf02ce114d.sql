-- Update RLS policies for support_tickets to support wallet-based submissions without authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;

-- Create new policies that support both authenticated and wallet-based access
CREATE POLICY "Users can create tickets with wallet or auth"
ON public.support_tickets
FOR INSERT
WITH CHECK (
  -- Either authenticated and user_id matches
  (auth.uid() = user_id)
  OR
  -- Or wallet address is provided (for unauthenticated web3 users)
  (wallet_address IS NOT NULL AND wallet_address != '')
);

CREATE POLICY "Users can view their own tickets by auth or wallet"
ON public.support_tickets
FOR SELECT
USING (
  -- Authenticated users can view by user_id
  auth.uid() = user_id
);