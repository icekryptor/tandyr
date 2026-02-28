-- Миграция 011: Глобальные настройки системы
-- Хранит настраиваемые параметры экономики и норм расхода

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Начальные значения
INSERT INTO settings (key, value, description) VALUES
  ('shift_base_rate',             '1500',  'Выплата за выход на смену (₽)'),
  ('shift_kg_rate',               '300',   'Выплата за 10 кг выработки (₽)'),
  ('price_per_kg',                '150',   'Цена продукции для расчёта выручки (₽/кг)'),
  ('flour_daily_consumption',     '25',    'Мука: норма расхода кг/день'),
  ('sugar_daily_consumption',     '2',     'Сахар: норма расхода кг/день'),
  ('salt_daily_consumption',      '1',     'Соль: норма расхода кг/день'),
  ('dry_milk_daily_consumption',  '10',    'Сухое молоко: норма расхода кг/день'),
  ('yeast_daily_consumption',     '0.25',  'Дрожжи: норма расхода кг/день'),
  ('oil_daily_consumption',       '5',     'Масло (сливочное): норма расхода кг/день')
ON CONFLICT (key) DO NOTHING;

-- RLS: читать могут все авторизованные, писать — только owner/admin
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_read" ON settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_write" ON settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND company_role IN ('owner', 'admin')
    )
  );
