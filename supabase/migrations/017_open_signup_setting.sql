-- ============================================================
-- 017: Open admin signup toggle
-- ============================================================
-- A single row in `settings` controls whether /signup is reachable.
-- Default 'true' for the launch window; flip to 'false' from the
-- Settings UI when the team is established.
-- ============================================================

INSERT INTO public.settings (key, value, description)
VALUES (
  'open_signup_enabled',
  'true',
  'Когда true — страница /signup открыта для регистрации админов. Временная фича на запуск. Выключите когда команда сформирована.'
)
ON CONFLICT (key) DO NOTHING;
