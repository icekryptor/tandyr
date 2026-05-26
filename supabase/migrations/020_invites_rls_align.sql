-- ============================================================
-- 020: Align invites RLS with is_admin() convention
-- ============================================================
-- Migration 019's "Admins manage invites" policy narrowly checked
-- role='admin'. Migration 016 established the broader is_admin()
-- helper which also accepts business owners/admins. The createInvite
-- server action uses both system AND business admin checks; the RLS
-- should match (defence in depth — even if the action switches off
-- the service-role client later, the policy will still authorize
-- the correct set).
-- ============================================================

DROP POLICY IF EXISTS "Admins manage invites" ON public.invites;

CREATE POLICY "Admins manage invites" ON public.invites
  FOR ALL USING (public.is_admin());
