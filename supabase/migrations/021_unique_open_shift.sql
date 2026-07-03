-- ============================================================
-- 021: One open shift per user (closes check-then-insert race)
-- ============================================================
-- Two near-simultaneous startShift calls could both pass the
-- application-level guard and create two open shifts, after which
-- every maybeSingle() reader errors and the hub shows no shift.
-- Enforce at the DB level.
-- ============================================================

-- Close duplicates defensively before adding the index (keep newest open)
UPDATE public.shifts s
SET status = 'closed',
    end_time = COALESCE(s.end_time, now())
WHERE s.status = 'open'
  AND EXISTS (
    SELECT 1 FROM public.shifts newer
    WHERE newer.user_id = s.user_id
      AND newer.status = 'open'
      AND newer.start_time > s.start_time
  );

CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_shift_per_user
  ON public.shifts (user_id)
  WHERE status = 'open';
