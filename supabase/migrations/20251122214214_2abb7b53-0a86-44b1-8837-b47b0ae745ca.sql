-- Add duration_days field to raffles table to store the raffle duration
ALTER TABLE public.raffles 
ADD COLUMN duration_days INTEGER;

-- Update existing raffles to have a default duration of 7 days if they don't have one
UPDATE public.raffles 
SET duration_days = 7 
WHERE duration_days IS NULL;