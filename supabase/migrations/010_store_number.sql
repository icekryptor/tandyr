-- Миграция 010: Читаемый номер магазина
-- Добавляет автоинкрементный порядковый номер для удобного отображения

ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_number SERIAL;

-- Создаём уникальный индекс
CREATE UNIQUE INDEX IF NOT EXISTS stores_store_number_idx ON stores (store_number);
