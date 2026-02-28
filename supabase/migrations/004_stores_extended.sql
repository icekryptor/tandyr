-- ============================================================
-- Extend stores: chain, contact info, resources
-- Run this in Supabase SQL Editor
-- ============================================================

-- New columns on stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS chain TEXT CHECK (chain IN ('lenta', 'magnit', 'okey')),
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Store resources (flour, sugar, salt, oil, dry milk, yeast)
CREATE TABLE IF NOT EXISTS public.store_resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  resource    TEXT NOT NULL CHECK (resource IN ('flour', 'sugar', 'salt', 'oil', 'dry_milk', 'yeast')),
  quantity_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, resource)
);

CREATE INDEX IF NOT EXISTS idx_store_resources_store ON public.store_resources(store_id);

-- Seed default resources for existing stores
INSERT INTO public.store_resources (store_id, resource, quantity_kg)
SELECT s.id, r.resource, 0
FROM public.stores s
CROSS JOIN (VALUES ('flour'), ('sugar'), ('salt'), ('oil'), ('dry_milk'), ('yeast')) AS r(resource)
ON CONFLICT (store_id, resource) DO NOTHING;

-- RLS for store_resources
ALTER TABLE public.store_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to store_resources"
  ON public.store_resources FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Employees read store_resources"
  ON public.store_resources FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'employee')
  );

-- Function to auto-seed resources when a new store is created
CREATE OR REPLACE FUNCTION seed_store_resources()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.store_resources (store_id, resource, quantity_kg)
  VALUES
    (NEW.id, 'flour', 0),
    (NEW.id, 'sugar', 0),
    (NEW.id, 'salt', 0),
    (NEW.id, 'oil', 0),
    (NEW.id, 'dry_milk', 0),
    (NEW.id, 'yeast', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seed_store_resources
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION seed_store_resources();
