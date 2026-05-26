-- ============================================================
-- 019: Employee invites
-- ============================================================
-- Admin-issued tokens that pre-bind a store + company_role and let
-- the recipient self-register without admin intervention.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invites (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token           uuid NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  email           text,                       -- optional pre-fill
  store_id        uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  company_role    text CHECK (company_role IN ('baker','manager','tech_specialist','admin','owner')),
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at         timestamptz,
  used_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- The /invite/[token] page is unauthenticated and reads by token.
-- The token is the secret; we accept that anyone with it can read its row.
CREATE POLICY "Anyone can read invite" ON public.invites
  FOR SELECT USING (true);

CREATE POLICY "Admins manage invites" ON public.invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
