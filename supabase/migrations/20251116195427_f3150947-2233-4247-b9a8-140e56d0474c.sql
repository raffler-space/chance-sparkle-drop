-- Add display_order column to raffles table for custom ordering
ALTER TABLE public.raffles 
ADD COLUMN display_order integer DEFAULT 0;

-- Create index for faster sorting
CREATE INDEX idx_raffles_display_order ON public.raffles(display_order);

-- Update existing raffles to have sequential order based on creation date
UPDATE public.raffles 
SET display_order = subquery.row_num 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num 
  FROM public.raffles
) as subquery 
WHERE public.raffles.id = subquery.id;