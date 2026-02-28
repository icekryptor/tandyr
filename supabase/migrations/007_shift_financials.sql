-- ============================================================
-- 007: Shift number + financial fields
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Auto-incrementing shift number
CREATE SEQUENCE IF NOT EXISTS shift_number_seq START 1;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS shift_number  INTEGER DEFAULT nextval('shift_number_seq'),
  ADD COLUMN IF NOT EXISTS accrual       DOUBLE PRECISION,         -- начислено за смену
  ADD COLUMN IF NOT EXISTS fine          DOUBLE PRECISION,         -- штраф
  ADD COLUMN IF NOT EXISTS fine_reason   TEXT,                     -- причина штрафа
  ADD COLUMN IF NOT EXISTS fine_comment  TEXT,                     -- комментарий администратора
  ADD COLUMN IF NOT EXISTS end_lat       DOUBLE PRECISION,         -- already exists, skip if error
  ADD COLUMN IF NOT EXISTS end_lng       DOUBLE PRECISION;         -- already exists, skip if error

-- Unique index on shift_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_shift_number ON public.shifts(shift_number);

-- Backfill shift_number for existing rows (ordered by start_time)
DO $$
DECLARE
  r RECORD;
  n INTEGER := 1;
BEGIN
  FOR r IN SELECT id FROM public.shifts ORDER BY start_time ASC LOOP
    UPDATE public.shifts SET shift_number = n WHERE id = r.id AND shift_number IS NULL;
    n := n + 1;
  END LOOP;
END;
$$;
