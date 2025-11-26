-- Allow admins to insert referral points for manual adjustments
DROP POLICY IF EXISTS "System can insert points" ON public.referral_points;

CREATE POLICY "Admins and system can insert points"
ON public.referral_points
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);