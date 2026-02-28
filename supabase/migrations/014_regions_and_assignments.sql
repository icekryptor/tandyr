-- Migration 014: Regions, user-store assignments, city FK on stores
-- Run after: 013_tech_requests_extended.sql

-- ─── Regions (group of cities managed by a manager) ──────────────────────────
CREATE TABLE IF NOT EXISTS regions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS region_cities (
  region_id UUID NOT NULL REFERENCES regions(id)  ON DELETE CASCADE,
  city_id   UUID NOT NULL REFERENCES cities(id)   ON DELETE CASCADE,
  PRIMARY KEY (region_id, city_id)
);

-- Manager → region(s)
CREATE TABLE IF NOT EXISTS user_regions (
  user_id   UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, region_id)
);

-- Baker → stores (multi-store assignment)
CREATE TABLE IF NOT EXISTS user_stores (
  user_id  UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, store_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_region_cities_city_id  ON region_cities(city_id);
CREATE INDEX IF NOT EXISTS idx_user_regions_region_id ON user_regions(region_id);
CREATE INDEX IF NOT EXISTS idx_user_stores_store_id   ON user_stores(store_id);

-- ─── city_id FK on stores ─────────────────────────────────────────────────────
-- Add city_id (nullable FK) — to be populated via data migration
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE SET NULL;

-- Backfill: match existing stores.city TEXT to cities.name
UPDATE stores s
SET city_id = c.id
FROM cities c
WHERE lower(s.city) = lower(c.name)
  AND s.city_id IS NULL;

-- Index for city-based queries
CREATE INDEX IF NOT EXISTS idx_stores_city_id ON stores(city_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE regions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_regions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stores   ENABLE ROW LEVEL SECURITY;

-- Full access for owner/admin
CREATE POLICY "regions_admin_all"       ON regions       FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND company_role IN ('owner','admin')));
CREATE POLICY "region_cities_admin_all" ON region_cities FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND company_role IN ('owner','admin')));
CREATE POLICY "user_regions_admin_all"  ON user_regions  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND company_role IN ('owner','admin')));
CREATE POLICY "user_stores_admin_all"   ON user_stores   FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND company_role IN ('owner','admin')));

-- Read access for all authenticated (manager sees their regions, baker sees their stores)
CREATE POLICY "regions_read"       ON regions       FOR SELECT TO authenticated USING (true);
CREATE POLICY "region_cities_read" ON region_cities FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_regions_own"   ON user_regions  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_stores_own"    ON user_stores   FOR SELECT TO authenticated
  USING (user_id = auth.uid());
