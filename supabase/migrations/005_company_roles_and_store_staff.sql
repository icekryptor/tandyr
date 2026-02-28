-- ============================================================
-- 005: Company roles on users + city/staff on stores
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add company_role to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS company_role TEXT
    CHECK (company_role IN ('baker', 'manager', 'tech_specialist', 'admin', 'owner'));

-- 2. Add city, manager_id, tech_specialist_id to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tech_specialist_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stores_manager ON public.stores(manager_id);
CREATE INDEX IF NOT EXISTS idx_stores_tech_specialist ON public.stores(tech_specialist_id);
