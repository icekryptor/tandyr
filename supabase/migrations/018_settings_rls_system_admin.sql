-- ============================================================
-- 018: Settings write RLS — also allow system admins
-- ============================================================
-- The settings_write policy from 011 only checked company_role.
-- Mirror the application-level gate fix: a system admin
-- (users.role = 'admin') should also be able to write settings,
-- not just business admins/owners (company_role).
-- ============================================================

DROP POLICY IF EXISTS settings_write ON public.settings;

CREATE POLICY settings_write ON public.settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND (
          users.role = 'admin'
          OR users.company_role = ANY (ARRAY['owner'::text, 'admin'::text])
        )
    )
  );
