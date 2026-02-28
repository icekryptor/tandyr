-- ============================================================
-- 006: Extended employee profile
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Basic info
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS birth_date       DATE,
  ADD COLUMN IF NOT EXISTS city             TEXT,

-- Payment info
  ADD COLUMN IF NOT EXISTS bank_name        TEXT CHECK (bank_name IN ('sber', 'tbank', 'alfa', 'vtb', 'raiffeisen', 'gazprom', 'rosbank', 'otkrytie', 'other')),
  ADD COLUMN IF NOT EXISTS card_number      TEXT,
  ADD COLUMN IF NOT EXISTS card_pin         TEXT,
  ADD COLUMN IF NOT EXISTS debt             DOUBLE PRECISION NOT NULL DEFAULT 0,

-- Documents
  ADD COLUMN IF NOT EXISTS patent_expires_at   DATE,
  ADD COLUMN IF NOT EXISTS patent_region       TEXT,
  ADD COLUMN IF NOT EXISTS nationality         TEXT,
  ADD COLUMN IF NOT EXISTS passport_number     TEXT,
  ADD COLUMN IF NOT EXISTS med_book_expires_at DATE,

-- File URLs (stored in Supabase Storage)
  ADD COLUMN IF NOT EXISTS contract_url     TEXT,
  ADD COLUMN IF NOT EXISTS passport_url     TEXT;

-- Storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-docs', 'employee-docs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for employee-docs bucket
CREATE POLICY "Admins can upload employee docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'employee-docs' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can read employee docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'employee-docs' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete employee docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'employee-docs' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
