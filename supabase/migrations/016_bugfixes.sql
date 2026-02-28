-- Migration 016: Critical bugfixes
-- Run after: 015_rls_roles.sql

-- ════════════════════════════════════════════════════════════════
-- FIX 1: tech_requests needs store_id for city-filtered RLS (015)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE tech_requests
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

-- Backfill store_id from the related shift (if shift exists)
UPDATE tech_requests tr
SET store_id = s.store_id
FROM shifts s
WHERE tr.shift_id = s.id
  AND tr.store_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tech_requests_store_id ON tech_requests(store_id);

-- ════════════════════════════════════════════════════════════════
-- FIX 2: Fix supply trigger double-counting inventory
-- The old trigger did INSERT ON CONFLICT DO NOTHING then unconditional UPDATE,
-- which doubled the quantity on first insert.
-- Fix: use proper INSERT ... ON CONFLICT DO UPDATE (upsert).
-- ════════════════════════════════════════════════════════════════

-- First, add a unique constraint for the upsert to work
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_store_item_unit_unique'
  ) THEN
    ALTER TABLE public.inventory
      ADD CONSTRAINT inventory_store_item_unit_unique
      UNIQUE (store_id, item_name, unit);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_inventory_on_supply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.inventory (store_id, item_name, quantity, unit, updated_at)
  VALUES (NEW.store_id, NEW.item_name, NEW.quantity, NEW.unit, NOW())
  ON CONFLICT (store_id, item_name, unit)
  DO UPDATE SET
    quantity   = inventory.quantity + EXCLUDED.quantity,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- FIX 3: Update is_admin() to also recognize owner company_role
-- Old: only checks role = 'admin'
-- New: checks role = 'admin' OR company_role IN ('owner', 'admin')
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (role = 'admin' OR company_role IN ('owner', 'admin'))
  );
$$;

-- ════════════════════════════════════════════════════════════════
-- FIX 4: Drop old overly-broad SELECT policies that bypass city filtering
-- The old policies from 001 grant read to all authenticated users,
-- making the city-filtered policies from 015 ineffective.
-- ════════════════════════════════════════════════════════════════
DO $$ BEGIN
  -- stores: drop the old broad policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Anyone authenticated can read stores'
  ) THEN
    DROP POLICY "Anyone authenticated can read stores" ON stores;
  END IF;

  -- shifts: drop old broad policy; city-filtered + own-shifts already covers this
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'Employees see own shifts'
  ) THEN
    DROP POLICY "Employees see own shifts" ON shifts;
  END IF;

  -- tech_requests: drop old broad policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tech_requests' AND policyname = 'Employees see own tech requests'
  ) THEN
    DROP POLICY "Employees see own tech requests" ON tech_requests;
  END IF;
END $$;
