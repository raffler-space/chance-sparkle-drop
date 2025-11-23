-- Add RLS policy to allow anyone to view all tickets for live feed feature
CREATE POLICY "Anyone can view all tickets" 
ON public.tickets 
FOR SELECT 
USING (true);