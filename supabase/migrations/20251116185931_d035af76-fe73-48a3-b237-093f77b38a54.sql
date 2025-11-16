-- Add launch_time column to raffles table for upcoming raffle countdown
ALTER TABLE raffles 
ADD COLUMN launch_time timestamp with time zone;