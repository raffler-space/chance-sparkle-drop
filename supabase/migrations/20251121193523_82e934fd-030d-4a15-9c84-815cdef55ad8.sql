-- Add DELETE policy for site_content table to allow admins to remove content
CREATE POLICY "Admins can delete site content"
ON public.site_content
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));