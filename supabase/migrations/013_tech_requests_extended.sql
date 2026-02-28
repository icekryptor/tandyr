-- Migration 013: Extended tech_requests fields for full resolution workflow
-- Run after: 012_inventory_acts.sql

ALTER TABLE tech_requests
  ADD COLUMN IF NOT EXISTS assigned_to            UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS taken_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline               DATE,
  ADD COLUMN IF NOT EXISTS resolution_photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS resolution_description TEXT,
  ADD COLUMN IF NOT EXISTS resolution_cost        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS resolved_at            TIMESTAMPTZ;

-- Index for assigned tech specialist queries
CREATE INDEX IF NOT EXISTS idx_tech_requests_assigned_to ON tech_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tech_requests_deadline     ON tech_requests(deadline)
  WHERE deadline IS NOT NULL;
