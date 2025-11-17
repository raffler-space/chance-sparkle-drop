-- Create function to automatically track referral earnings when tickets are purchased
CREATE OR REPLACE FUNCTION public.track_referral_earning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_commission_amount numeric;
  v_commission_rate numeric := 5; -- 5% commission rate
BEGIN
  -- Find if this user was referred by someone
  SELECT referrer_id INTO v_referrer_id
  FROM public.referrals
  WHERE referred_id = NEW.user_id;

  -- If user was referred, create a referral earning record
  IF v_referrer_id IS NOT NULL THEN
    v_commission_amount := NEW.purchase_price * (v_commission_rate / 100);
    
    INSERT INTO public.referral_earnings (
      referrer_id,
      referred_id,
      ticket_id,
      raffle_id,
      amount,
      commission_rate,
      status
    ) VALUES (
      v_referrer_id,
      NEW.user_id,
      NEW.id,
      NEW.raffle_id,
      v_commission_amount,
      v_commission_rate,
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to track referral earnings on ticket purchases
DROP TRIGGER IF EXISTS trigger_track_referral_earning ON public.tickets;
CREATE TRIGGER trigger_track_referral_earning
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.track_referral_earning();