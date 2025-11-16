
-- Drop the old status check constraint
ALTER TABLE raffles DROP CONSTRAINT IF EXISTS raffles_status_check;

-- Add new check constraint that includes 'draft' status
ALTER TABLE raffles ADD CONSTRAINT raffles_status_check 
CHECK (status IN ('active', 'completed', 'drawing', 'draft'));
