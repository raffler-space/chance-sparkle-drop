-- Add contract_raffle_id column to track on-chain raffle ID
ALTER TABLE public.raffles 
ADD COLUMN contract_raffle_id integer;

-- Add index for faster lookups
CREATE INDEX idx_raffles_contract_id ON public.raffles(contract_raffle_id);