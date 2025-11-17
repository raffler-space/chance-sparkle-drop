-- Add show_on_raffles column to raffles table
ALTER TABLE raffles 
ADD COLUMN show_on_raffles boolean NOT NULL DEFAULT true;