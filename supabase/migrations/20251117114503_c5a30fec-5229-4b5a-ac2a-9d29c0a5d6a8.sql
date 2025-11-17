-- Create function to register user's referral code on signup
CREATE OR REPLACE FUNCTION public.register_user_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a referral code entry for the new user
  -- Using first 8 characters of user ID as the referral code
  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    referral_code
  ) VALUES (
    NEW.id,
    NEW.id, -- Self-reference to create the code
    substring(NEW.id::text, 1, 8)
  )
  ON CONFLICT (referred_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger to register referral code on user creation
DROP TRIGGER IF EXISTS trigger_register_referral_code ON auth.users;
CREATE TRIGGER trigger_register_referral_code
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.register_user_referral_code();