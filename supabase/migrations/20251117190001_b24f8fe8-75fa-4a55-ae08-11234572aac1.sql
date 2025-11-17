-- Add show_on_home column to raffles table
ALTER TABLE public.raffles 
ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.raffles.show_on_home IS 'Controls whether this raffle is displayed on the home page';