-- Create referral tiers table
CREATE TABLE public.referral_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text NOT NULL UNIQUE,
  tier_level integer NOT NULL UNIQUE,
  required_points integer NOT NULL,
  icon text DEFAULT '🎯',
  benefits text,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert default tiers
INSERT INTO public.referral_tiers (tier_name, tier_level, required_points, icon, benefits) VALUES
  ('Newbie', 1, 0, '🌱', 'Just getting started'),
  ('Hustler', 2, 500, '💪', 'Building momentum'),
  ('Influencer', 3, 2000, '⚡', 'Making waves'),
  ('Champion', 4, 5000, '👑', 'Elite status unlocked'),
  ('Legend', 5, 10000, '🔥', 'Top tier performer'),
  ('Raffler', 6, 25000, '💎', 'Ultimate Raffler status - Exclusive rewards');

-- Create referral points tracking table
CREATE TABLE public.referral_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_earned integer NOT NULL DEFAULT 0,
  points_source text NOT NULL, -- 'tier1_referral', 'tier2_referral', 'tier3_referral', 'daily_quest', etc
  reference_id uuid, -- Links to the related referral or quest completion
  created_at timestamp with time zone DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_referral_points_user_id ON public.referral_points(user_id);
CREATE INDEX idx_referral_points_created_at ON public.referral_points(created_at);

-- Create daily quests table
CREATE TABLE public.daily_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_name text NOT NULL,
  quest_description text NOT NULL,
  quest_type text NOT NULL, -- 'share_twitter', 'share_telegram', 'share_facebook', 'share_whatsapp', etc
  points_reward integer NOT NULL DEFAULT 50,
  icon text DEFAULT '🎯',
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert default daily quests
INSERT INTO public.daily_quests (quest_name, quest_description, quest_type, points_reward, icon) VALUES
  ('Twitter Sharer', 'Share your referral link on Twitter/X', 'share_twitter', 50, '🔗'),
  ('Telegram Broadcaster', 'Share your referral link on Telegram', 'share_telegram', 50, '✈️'),
  ('Facebook Connector', 'Share your referral link on Facebook', 'share_facebook', 50, '📘'),
  ('WhatsApp Messenger', 'Share your referral link on WhatsApp', 'share_whatsapp', 50, '💬');

-- Create user quest completions table
CREATE TABLE public.user_quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES public.daily_quests(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, quest_id, completed_date)
);

CREATE INDEX idx_quest_completions_user_date ON public.user_quest_completions(user_id, completed_date);

-- Add referral tier level to referrals table
ALTER TABLE public.referrals 
ADD COLUMN referral_tier integer DEFAULT 1,
ADD COLUMN parent_referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.referral_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quest_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_tiers (public read)
CREATE POLICY "Anyone can view referral tiers"
  ON public.referral_tiers FOR SELECT
  USING (true);

-- RLS Policies for referral_points
CREATE POLICY "Users can view their own points"
  ON public.referral_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points"
  ON public.referral_points FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert points"
  ON public.referral_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_quests
CREATE POLICY "Anyone can view active quests"
  ON public.daily_quests FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage quests"
  ON public.daily_quests FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_quest_completions
CREATE POLICY "Users can view their own quest completions"
  ON public.user_quest_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quest completions"
  ON public.user_quest_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all quest completions"
  ON public.user_quest_completions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Function to award points for referrals with tier support
CREATE OR REPLACE FUNCTION public.award_referral_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_parent_referral record;
  v_grandparent_referral record;
BEGIN
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
    LIMIT 1;

    IF FOUND THEN
      -- Create tier 2 referral record
      INSERT INTO public.referrals (referrer_id, referred_id, referral_code, referral_tier, parent_referral_id)
      VALUES (v_parent_referral.referrer_id, NEW.referred_id, v_parent_referral.referral_code, 2, NEW.id);

      -- Check for tier 3
      SELECT * INTO v_grandparent_referral
      FROM public.referrals
      WHERE referred_id = v_parent_referral.referrer_id
      AND referral_tier = 1
      LIMIT 1;

      IF FOUND THEN
        -- Create tier 3 referral record
        INSERT INTO public.referrals (referrer_id, referred_id, referral_code, referral_tier, parent_referral_id)
        VALUES (v_grandparent_referral.referrer_id, NEW.referred_id, v_grandparent_referral.referral_code, 3, NEW.id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for awarding referral points
CREATE TRIGGER trigger_award_referral_points
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.award_referral_points();

-- Function to award points for quest completion
CREATE OR REPLACE FUNCTION public.award_quest_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
BEGIN
  -- Get points reward for the quest
  SELECT points_reward INTO v_points
  FROM public.daily_quests
  WHERE id = NEW.quest_id;

  -- Award points
  INSERT INTO public.referral_points (user_id, points_earned, points_source, reference_id)
  VALUES (NEW.user_id, v_points, 'daily_quest', NEW.id);

  RETURN NEW;
END;
$$;

-- Create trigger for awarding quest points
CREATE TRIGGER trigger_award_quest_points
  AFTER INSERT ON public.user_quest_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_quest_points();