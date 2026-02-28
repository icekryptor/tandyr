-- ============================================================
-- 008: Weekly salary system
-- Run this in your Supabase SQL Editor
-- ============================================================

-- New weekly salaries table
CREATE TABLE IF NOT EXISTS public.weekly_salaries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Period
  week_number      INTEGER NOT NULL,        -- ISO week (1–53)
  week_year        INTEGER NOT NULL,        -- ISO year
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,

  -- Auto-calculated from shifts
  shift_count      INTEGER NOT NULL DEFAULT 0,
  total_kg         DOUBLE PRECISION NOT NULL DEFAULT 0,
  accrual_kg       DOUBLE PRECISION NOT NULL DEFAULT 0,   -- total_kg * 30
  accrual_shift    DOUBLE PRECISION NOT NULL DEFAULT 0,   -- shift_count * 1500
  total_accrual    DOUBLE PRECISION NOT NULL DEFAULT 0,   -- accrual_kg + accrual_shift
  fines_total      DOUBLE PRECISION NOT NULL DEFAULT 0,   -- sum(shifts.fine) for period

  -- Manual inputs
  current_debt     DOUBLE PRECISION NOT NULL DEFAULT 0,
  transferred      DOUBLE PRECISION,                      -- actually paid
  debt_written_off DOUBLE PRECISION,                      -- debt forgiven this week

  -- Status
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid')),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, week_year, week_number)
);

CREATE INDEX IF NOT EXISTS idx_weekly_salaries_user_id    ON public.weekly_salaries(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_salaries_week       ON public.weekly_salaries(week_year, week_number);

-- RLS
ALTER TABLE public.weekly_salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage weekly salaries"
  ON public.weekly_salaries FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Employees see own weekly salary"
  ON public.weekly_salaries FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- DEMO DATA  (week 8 / 2026 = Feb 16–22, 2026)
-- Uses the first active employee and first store in the DB.
-- Safe to run even if no shifts exist yet.
-- ============================================================

DO $$
DECLARE
  v_user_id   UUID;
  v_store_id  UUID;
  v_shift1    UUID := uuid_generate_v4();
  v_shift2    UUID := uuid_generate_v4();
  v_shift3    UUID := uuid_generate_v4();
  v_shift4    UUID := uuid_generate_v4();
  v_lat       DOUBLE PRECISION := 55.751244;
  v_lng       DOUBLE PRECISION := 37.618423;
  v_photo     TEXT := 'https://placehold.co/800x600/e2e8f0/94a3b8?text=demo+photo';
BEGIN
  -- Pick first active employee (exclude admins if possible)
  SELECT id INTO v_user_id
  FROM public.users
  WHERE is_active = true
  ORDER BY
    CASE WHEN role = 'employee' THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1;

  -- Pick first store
  SELECT id INTO v_store_id
  FROM public.stores
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL OR v_store_id IS NULL THEN
    RAISE NOTICE 'Demo skipped: no users or stores found.';
    RETURN;
  END IF;

  -- Insert 4 demo shifts (Mon–Thu, week 8/2026)
  INSERT INTO public.shifts
    (id, user_id, store_id, start_photo_url, end_photo_url,
     start_lat, start_lng, end_lat, end_lng,
     start_time, end_time, production_kg, status, shift_number)
  VALUES
    (v_shift1, v_user_id, v_store_id, v_photo, v_photo,
     v_lat, v_lng, v_lat, v_lng,
     '2026-02-16 08:00:00+03', '2026-02-16 20:00:00+03', 50, 'closed',
     nextval('shift_number_seq')),
    (v_shift2, v_user_id, v_store_id, v_photo, v_photo,
     v_lat, v_lng, v_lat, v_lng,
     '2026-02-17 08:00:00+03', '2026-02-17 20:00:00+03', 50, 'closed',
     nextval('shift_number_seq')),
    (v_shift3, v_user_id, v_store_id, v_photo, v_photo,
     v_lat, v_lng, v_lat, v_lng,
     '2026-02-18 08:00:00+03', '2026-02-18 20:00:00+03', 50, 'closed',
     nextval('shift_number_seq')),
    (v_shift4, v_user_id, v_store_id, v_photo, v_photo,
     v_lat, v_lng, v_lat, v_lng,
     '2026-02-19 08:00:00+03', '2026-02-19 20:00:00+03', 50, 'closed',
     nextval('shift_number_seq'))
  ON CONFLICT DO NOTHING;

  -- Insert weekly salary record
  -- 4 shifts × 1500 = 6 000 ₽  |  200 kg × 30 = 6 000 ₽  |  Total = 12 000 ₽
  INSERT INTO public.weekly_salaries
    (user_id, week_number, week_year, period_start, period_end,
     shift_count, total_kg, accrual_kg, accrual_shift, total_accrual,
     fines_total, current_debt, status)
  VALUES
    (v_user_id, 8, 2026, '2026-02-16', '2026-02-22',
     4, 200, 6000, 6000, 12000,
     0, 0, 'pending')
  ON CONFLICT (user_id, week_year, week_number) DO NOTHING;

  RAISE NOTICE 'Demo data inserted for user % in store %', v_user_id, v_store_id;
END;
$$;
