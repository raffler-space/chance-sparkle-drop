-- Add network field to raffles table to track testnet vs mainnet
ALTER TABLE public.raffles 
ADD COLUMN network text NOT NULL DEFAULT 'mainnet' CHECK (network IN ('testnet', 'mainnet'));