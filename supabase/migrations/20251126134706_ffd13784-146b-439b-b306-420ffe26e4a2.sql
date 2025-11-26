-- Fix referral system to prevent signup errors
-- The issue: referred_id has a unique constraint, but we're trying to insert both
-- a self-referral (for user's own code) and actual referral (if they used someone's code)

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_register_referral_code ON auth.users;

-- Drop the function with CASCADE to handle all dependencies
DROP FUNCTION IF EXISTS public.register_user_referral_code() CASCADE;

-- Drop the unique constraint on referred_id to allow both self-referrals and actual referrals
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referred_id_key;

-- Add a new column to distinguish self-referrals from actual referrals
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS is_self_referral boolean DEFAULT false;

-- Create a compound unique constraint: each user can have ONE self-referral
CREATE UNIQUE INDEX IF NOT EXISTS unique_self_referral 
ON public.referrals(referred_id) 
WHERE is_self_referral = true;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_referrals_actual 
ON public.referrals(referred_id, referrer_id) 
WHERE is_self_referral = false;

-- Update existing self-referrals
UPDATE public.referrals 
SET is_self_referral = true 
WHERE referrer_id = referred_id;

-- Create new trigger function that only creates self-referral for referral code
CREATE OR REPLACE FUNCTION public.register_user_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create ONLY a self-referral entry to store the user's personal referral code
  -- Actual referral relationships are created separately in the app
  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    referral_code,
    is_self_referral
  ) VALUES (
    NEW.id,
    NEW.id,
    substring(NEW.id::text, 1, 8),
    true
  );

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.register_user_referral_code();