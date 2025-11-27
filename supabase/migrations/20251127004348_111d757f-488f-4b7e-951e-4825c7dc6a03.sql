-- Fix the award_referral_points trigger to NOT fire for self-referrals
-- This was causing tier 2/3 records to be created incorrectly for self-referrals

CREATE OR REPLACE FUNCTION public.award_referral_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_points integer;
  v_parent_referral record;
  v_grandparent_referral record;
BEGIN
  -- Skip self-referrals completely
  IF NEW.is_self_referral = true THEN
    RETURN NEW;
  END IF;

  -- Award points based on tier
  CASE NEW.referral_tier
    WHEN 1 THEN v_points := 100; -- Direct referral
    WHEN 2 THEN v_points := 50;  -- Second tier
    WHEN 3 THEN v_points := 25;  -- Third tier
    ELSE v_points := 0;
  END CASE;

  -- Award points to the referrer
  IF v_points > 0 THEN
    INSERT INTO public.referral_points (user_id, points_earned, points_source, reference_id)
    VALUES (NEW.referrer_id, v_points, 'tier' || NEW.referral_tier || '_referral', NEW.id);
  END IF;

  -- Handle multi-tier referrals
  IF NEW.referral_tier = 1 THEN
    -- Check if the referrer was also referred (create tier 2)
    SELECT * INTO v_parent_referral
    FROM public.referrals
    WHERE referred_id = NEW.referrer_id
    AND referral_tier = 1
    AND is_self_referral = false
    LIMIT 1;

    IF FOUND THEN
      -- Create tier 2 referral record
      INSERT INTO public.referrals (referrer_id, referred_id, referral_code, referral_tier, parent_referral_id, is_self_referral)
      VALUES (v_parent_referral.referrer_id, NEW.referred_id, v_parent_referral.referral_code, 2, NEW.id, false);

      -- Check for tier 3
      SELECT * INTO v_grandparent_referral
      FROM public.referrals
      WHERE referred_id = v_parent_referral.referrer_id
      AND referral_tier = 1
      AND is_self_referral = false
      LIMIT 1;

      IF FOUND THEN
        -- Create tier 3 referral record
        INSERT INTO public.referrals (referrer_id, referred_id, referral_code, referral_tier, parent_referral_id, is_self_referral)
        VALUES (v_grandparent_referral.referrer_id, NEW.referred_id, v_grandparent_referral.referral_code, 3, NEW.id, false);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Clean up broken self-referral tier 2/3 records
DELETE FROM public.referrals 
WHERE is_self_referral = false 
AND referrer_id = referred_id;

-- Clean up any orphaned referral points from broken records
DELETE FROM public.referral_points
WHERE reference_id IN (
  SELECT id FROM public.referrals 
  WHERE is_self_referral = false 
  AND referrer_id = referred_id
);