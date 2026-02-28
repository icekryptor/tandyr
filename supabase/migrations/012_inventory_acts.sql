-- Migration 012: Inventory acts (weekly stocktaking)
-- Run after: 011_settings.sql

-- Inventory acts — one record per store per week
CREATE TABLE IF NOT EXISTS inventory_acts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id       UUID NOT NULL REFERENCES stores(id)  ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  week_number    INTEGER NOT NULL,
  week_year      INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,        -- Sunday of the given week
  conducted_at   TIMESTAMPTZ,          -- NULL = not yet conducted
  status         TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'overdue')) DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, week_year, week_number)
);

-- Line items for each act
CREATE TABLE IF NOT EXISTS inventory_act_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  act_id        UUID NOT NULL REFERENCES inventory_acts(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,   -- flour | sugar | salt | dry_milk | yeast | oil
  item_name     TEXT NOT NULL,
  quantity_kg   DOUBLE PRECISION NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_inventory_acts_store_id ON inventory_acts(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_acts_user_id  ON inventory_acts(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_acts_status   ON inventory_acts(status);
CREATE INDEX IF NOT EXISTS idx_inventory_act_items_act ON inventory_act_items(act_id);

-- RLS
ALTER TABLE inventory_acts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_act_items ENABLE ROW LEVEL SECURITY;

-- Admin/owner/manager: full access
CREATE POLICY "acts_admin_all" ON inventory_acts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND company_role IN ('owner','admin','manager'))
  );

CREATE POLICY "act_items_admin_all" ON inventory_act_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND company_role IN ('owner','admin','manager'))
  );

-- Baker: can read their own acts + insert completed acts
CREATE POLICY "acts_baker_own" ON inventory_acts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "acts_baker_insert" ON inventory_acts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "acts_baker_update_own" ON inventory_acts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "act_items_baker_insert" ON inventory_act_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM inventory_acts WHERE id = act_id AND user_id = auth.uid())
  );

CREATE POLICY "act_items_baker_select" ON inventory_act_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM inventory_acts WHERE id = act_id AND user_id = auth.uid())
  );
