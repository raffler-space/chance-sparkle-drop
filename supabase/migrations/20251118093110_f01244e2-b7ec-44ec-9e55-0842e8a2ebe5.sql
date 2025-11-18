-- Create site_content table for managing text content across the site
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text UNIQUE NOT NULL,
  content_value text NOT NULL,
  description text,
  page text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view content
CREATE POLICY "Anyone can view site content"
ON public.site_content
FOR SELECT
USING (true);

-- Only admins can update content
CREATE POLICY "Admins can update site content"
ON public.site_content
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert content
CREATE POLICY "Admins can insert site content"
ON public.site_content
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add columns to raffles table for detailed pages
ALTER TABLE public.raffles
ADD COLUMN gallery_images text[], -- Array of image URLs for gallery
ADD COLUMN detailed_description text, -- Longer description for detail page
ADD COLUMN rules text, -- Raffle rules
ADD COLUMN additional_info jsonb; -- Flexible field for extra info

-- Create trigger to update site_content timestamp
CREATE OR REPLACE FUNCTION update_site_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_content_timestamp_trigger
BEFORE UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION update_site_content_timestamp();

-- Insert default site content
INSERT INTO public.site_content (content_key, content_value, description, page) VALUES
('hero_title', 'WIN LUXURY PRIZES', 'Main hero title', 'home'),
('hero_subtitle', 'Enter blockchain-powered raffles for your chance to win exclusive luxury items', 'Hero subtitle', 'home'),
('hero_cta', 'Browse Raffles', 'Hero call to action button text', 'home'),
('upcoming_section_title', 'Upcoming Raffles', 'Upcoming raffles section title', 'home'),
('active_section_title', 'Active Raffles', 'Active raffles section title', 'home'),
('how_it_works_title', 'How It Works', 'How it works section title', 'home'),
('raffles_page_title', 'All Raffles', 'Main title on raffles page', 'raffles'),
('raffles_page_subtitle', 'Browse all available raffles and enter for your chance to win', 'Raffles page subtitle', 'raffles');