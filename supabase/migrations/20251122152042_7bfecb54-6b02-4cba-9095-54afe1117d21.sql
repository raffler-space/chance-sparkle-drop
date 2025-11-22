-- Drop the existing check constraint
ALTER TABLE raffles DROP CONSTRAINT IF EXISTS raffles_status_check;

-- Add the updated check constraint with 'Refunded' included
ALTER TABLE raffles ADD CONSTRAINT raffles_status_check 
CHECK (status IN ('draft', 'active', 'live', 'completed', 'cancelled', 'drawing', 'Refunding', 'Refunded'));