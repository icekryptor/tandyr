-- Migration 015: Role-based RLS helper functions + updated policies
-- Run after: 014_regions_and_assignments.sql
--
-- Role hierarchy:
--   owner/admin → see everything
--   manager     → see data in their region's cities
--   baker/tech_specialist → see data in their own cities (user_cities)

-- ─── Helper functions ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_owner_or_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND company_role IN ('owner', 'admin')
  );
$$;

-- Returns city IDs visible to the current user based on their role
CREATE OR REPLACE FUNCTION get_my_city_ids()
RETURNS UUID[]
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT CASE
    -- owner/admin → all cities
    WHEN EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND company_role IN ('owner','admin')
    )
    THEN ARRAY(SELECT id FROM cities)

    -- manager → cities in their regions
    WHEN EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND company_role = 'manager'
    )
    THEN ARRAY(
      SELECT rc.city_id
      FROM user_regions ur
      JOIN region_cities rc ON rc.region_id = ur.region_id
      WHERE ur.user_id = auth.uid()
    )

    -- baker/tech_specialist → cities from user_cities
    ELSE ARRAY(
      SELECT city_id FROM user_cities WHERE user_id = auth.uid()
    )
  END;
$$;

-- Returns store IDs directly assigned to the current user (for bakers)
CREATE OR REPLACE FUNCTION get_my_store_ids()
RETURNS UUID[]
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT ARRAY(
    SELECT store_id FROM user_stores WHERE user_id = auth.uid()
  );
$$;

-- ─── Refresh stores RLS to filter by city ────────────────────────────────────
-- Drop old broad policies if they exist, add city-filtered ones
DO $$ BEGIN
  -- stores: owner/admin see all, others see their cities
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_city_filtered'
  ) THEN
    CREATE POLICY "stores_city_filtered" ON stores
      FOR SELECT TO authenticated
      USING (
        city_id IS NULL -- stores without city are visible to all (backward compat)
        OR city_id = ANY(get_my_city_ids())
      );
  END IF;
END $$;

-- ─── shifts: filter by store city ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'shifts_city_filtered'
  ) THEN
    CREATE POLICY "shifts_city_filtered" ON shifts
      FOR SELECT TO authenticated
      USING (
        store_id IN (
          SELECT id FROM stores
          WHERE city_id IS NULL OR city_id = ANY(get_my_city_ids())
        )
        OR user_id = auth.uid() -- always see own shifts
      );
  END IF;
END $$;

-- ─── tech_requests: filter by store city ─────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tech_requests' AND policyname = 'tech_requests_city_filtered'
  ) THEN
    CREATE POLICY "tech_requests_city_filtered" ON tech_requests
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR store_id IN (
          SELECT id FROM stores
          WHERE city_id IS NULL OR city_id = ANY(get_my_city_ids())
        )
        OR is_owner_or_admin()
      );
  END IF;
END $$;

-- ─── weekly_salaries: filter by user city ────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weekly_salaries' AND policyname = 'weekly_salaries_city_filtered'
  ) THEN
    CREATE POLICY "weekly_salaries_city_filtered" ON weekly_salaries
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR is_owner_or_admin()
        OR user_id IN (
          SELECT u.id FROM users u
          JOIN user_cities uc ON uc.user_id = u.id
          WHERE uc.city_id = ANY(get_my_city_ids())
        )
      );
  END IF;
END $$;

-- ─── inventory_acts: filter by store city ────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_acts' AND policyname = 'inventory_acts_city_filtered'
  ) THEN
    CREATE POLICY "inventory_acts_city_filtered" ON inventory_acts
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR is_owner_or_admin()
        OR store_id IN (
          SELECT id FROM stores
          WHERE city_id IS NULL OR city_id = ANY(get_my_city_ids())
        )
      );
  END IF;
END $$;
