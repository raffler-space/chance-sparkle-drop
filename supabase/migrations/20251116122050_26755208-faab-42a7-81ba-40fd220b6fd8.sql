-- Create prize_claims table for managing winner claim requests
CREATE TABLE public.prize_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_id INTEGER NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  delivery_info TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.prize_claims ENABLE ROW LEVEL SECURITY;

-- Users can view their own claims
CREATE POLICY "Users can view their own claims"
ON public.prize_claims
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own claims
CREATE POLICY "Users can create their own claims"
ON public.prize_claims
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all claims
CREATE POLICY "Admins can view all claims"
ON public.prize_claims
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update claims (to mark as processed)
CREATE POLICY "Admins can update claims"
ON public.prize_claims
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));