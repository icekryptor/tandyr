#!/bin/sh
#
# Fill an empty Tandyr database with believable demo data: 2 cities, 6 stores,
# 13 employees, three weeks of shifts with production and fines, open shifts
# today, payroll, tech requests, supplies, inventory acts and chats.
#
# For the public demo only (TANDYR.md, «Публичное демо»). Employees get random
# passwords that are not saved: nobody signs in as them. Emails use the
# demo.tandyr.aics-93.ru subdomain, so no real mailbox can receive anything.
#
# Usage (from infra/supabase, stack running, migrated, schedule-functions done):
#   sh scripts/seed-demo.sh
#
set -e
cd "$(dirname "$0")/.."

env_get() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }
if [ -n "$(env_get TANDYR_API_PORT)" ]; then
    API_URL="http://$(env_get TANDYR_API_BIND):$(env_get TANDYR_API_PORT)"
else
    API_URL="http://127.0.0.1:$(env_get API_GW_HTTP_PORT)"
fi
PUBLIC_URL=$(env_get SUPABASE_PUBLIC_URL)
SERVICE_ROLE_KEY=$(env_get SERVICE_ROLE_KEY)

psql_db() {
    docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"
}

if [ "$(psql_db -tA -c 'SELECT count(*) FROM public.stores')" != "0" ]; then
    echo "Stores already exist; demo data goes into an empty database only." >&2
    exit 1
fi

umask 077
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
# Secrets travel via a 600 header file, never argv (visible in `ps`).
printf 'apikey: %s\nAuthorization: Bearer %s\n' "$SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY" > "$work/headers"

# --- Employees (Auth users; handle_new_user creates their profiles) ---------
# email local part | full name
cat > "$work/people" <<'EOF'
alisher.karimov|Алишер Каримов
dilnoza.yusupova|Дилноза Юсупова
rustam.nazarov|Рустам Назаров
farida.abdullaeva|Фарида Абдуллаева
ivan.petrov|Иван Петров
maria.sokolova|Мария Соколова
timur.khasanov|Тимур Хасанов
zarina.akhmedova|Зарина Ахмедова
sergey.volkov|Сергей Волков
gulnara.mirzoeva|Гульнара Мирзоева
elena.kuznetsova|Елена Кузнецова
artem.galiev|Артём Галиев
dmitry.orlov|Дмитрий Орлов
EOF
while IFS='|' read -r local name; do
    email="$local@demo.tandyr.aics-93.ru"
    jq -n --arg e "$email" --arg n "$name" --arg p "$(openssl rand -base64 24)" \
        '{email: $e, password: $p, email_confirm: true, user_metadata: {full_name: $n}}' |
        curl -sS -o "$work/resp" -X POST "$API_URL/auth/v1/admin/users" \
            -H @"$work/headers" -H 'Content-Type: application/json' --data-binary @-
    # A re-run after a failed SQL step finds the accounts already there.
    jq -e '.id or .error_code == "email_exists"' "$work/resp" >/dev/null ||
        { echo "Auth API error for $email: $(cat "$work/resp")" >&2; exit 1; }
done < "$work/people"
echo "Employees ready: $(wc -l < "$work/people" | tr -d ' ')."

# --- Placeholder photos (plain gradients; Storage only accepts images) ------
python3 - "$work" <<'PY'
import struct, sys, zlib
out = sys.argv[1]
palette = [(214, 160, 96), (190, 120, 70), (232, 196, 140), (160, 98, 60), (120, 130, 140), (90, 110, 130)]
def png(path, top, bottom, w=480, h=360):
    rows = b''
    for y in range(h):
        t = y / (h - 1)
        px = bytes(int(a + (b - a) * t) for a, b in zip(top, bottom))
        rows += b'\x00' + px * w
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b''))
for i, c in enumerate(palette):
    png(f'{out}/photo{i + 1}.png', c, tuple(max(0, v - 70) for v in c))
PY
upload() { # bucket, object path, file
    curl -sS -o /dev/null -w '%{http_code}' -X POST "$API_URL/storage/v1/object/$1/$2" \
        -H @"$work/headers" -H 'Content-Type: image/png' -H 'x-upsert: true' --data-binary @"$3"
}
for i in 1 2 3 4; do
    [ "$(upload shift-photos "demo/shift$i.png" "$work/photo$i.png")" = 200 ] || { echo "Upload failed" >&2; exit 1; }
done
for i in 5 6; do
    [ "$(upload tech-request-photos "demo/tech$i.png" "$work/photo$i.png")" = 200 ] || { echo "Upload failed" >&2; exit 1; }
done

# --- Everything else in one transaction -------------------------------------
{ printf '\\set photo_base %s\n' "$PUBLIC_URL/storage/v1/object/public"; cat <<'SQL'; } | psql_db
BEGIN;
SELECT setseed(0.42) \gset

CREATE TEMP TABLE demo_people (email text PRIMARY KEY, company_role text, city text, store_no int,
                               phone text, nationality text, bank text) ON COMMIT DROP;
INSERT INTO demo_people VALUES
  ('alisher.karimov',   'baker',           'Москва', 1, '+7 901 214-33-18', 'Узбекистан',  'sber'),
  ('dilnoza.yusupova',  'baker',           'Москва', 1, '+7 903 552-71-04', 'Узбекистан',  'tbank'),
  ('rustam.nazarov',    'baker',           'Москва', 2, '+7 905 118-64-90', 'Таджикистан', 'sber'),
  ('farida.abdullaeva', 'baker',           'Москва', 2, '+7 909 731-25-46', 'Таджикистан', 'alfa'),
  ('ivan.petrov',       'baker',           'Москва', 3, '+7 915 460-18-77', 'Россия',      'vtb'),
  ('maria.sokolova',    'baker',           'Москва', 3, '+7 916 383-92-15', 'Россия',      'tbank'),
  ('timur.khasanov',    'baker',           'Москва', 4, '+7 925 207-56-31', 'Кыргызстан',  'sber'),
  ('zarina.akhmedova',  'baker',           'Казань', 5, '+7 937 614-40-82', 'Узбекистан',  'sber'),
  ('sergey.volkov',     'baker',           'Казань', 5, '+7 917 295-13-69', 'Россия',      'gazprom'),
  ('gulnara.mirzoeva',  'baker',           'Казань', 6, '+7 939 848-27-53', 'Таджикистан', 'tbank'),
  ('elena.kuznetsova',  'manager',         'Москва', 1, '+7 903 100-45-12', 'Россия',      'sber'),
  ('artem.galiev',      'manager',         'Казань', 5, '+7 917 220-88-41', 'Россия',      'alfa'),
  ('dmitry.orlov',      'tech_specialist', 'Москва', 1, '+7 926 777-19-03', 'Россия',      'vtb');
UPDATE demo_people SET email = email || '@demo.tandyr.aics-93.ru';

-- Migrations already seed the main cities.
INSERT INTO public.cities (name) VALUES ('Москва'), ('Казань') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.regions (name) VALUES ('Центр'), ('Поволжье') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.region_cities
  SELECT r.id, c.id FROM public.regions r JOIN public.cities c
    ON (r.name, c.name) IN (('Центр', 'Москва'), ('Поволжье', 'Казань'))
  ON CONFLICT DO NOTHING;

INSERT INTO public.stores (name, address, latitude, longitude, chain, city, city_id, store_number,
                           contact_phone, contact_email)
SELECT s.name, s.address, s.lat, s.lng, s.chain, s.city, c.id, s.no, s.phone, NULL
FROM (VALUES
  (1, 'Лента — Ленинградское шоссе', 'Москва, Ленинградское ш., 58',    55.8366, 37.4880, 'lenta',  'Москва', '+7 495 120-11-01'),
  (2, 'Магнит — Профсоюзная',        'Москва, ул. Профсоюзная, 61',     55.6655, 37.5530, 'magnit', 'Москва', '+7 495 120-11-02'),
  (3, 'О''КЕЙ — Варшавское шоссе',   'Москва, Варшавское ш., 87Б',      55.6460, 37.6190, 'okey',   'Москва', '+7 495 120-11-03'),
  (4, 'Лента — Алтуфьево',           'Москва, Алтуфьевское ш., 70',     55.8790, 37.5870, 'lenta',  'Москва', '+7 495 120-11-04'),
  (5, 'Лента — проспект Ямашева',    'Казань, пр. Ямашева, 115А',       55.8230, 49.1350, 'lenta',  'Казань', '+7 843 210-22-05'),
  (6, 'Магнит — проспект Победы',    'Казань, пр. Победы, 141',         55.7520, 49.2120, 'magnit', 'Казань', '+7 843 210-22-06')
) AS s(no, name, address, lat, lng, chain, city, phone)
JOIN public.cities c ON c.name = s.city;

-- Profiles: role, store, contacts, documents due at different times.
UPDATE public.users u SET
  company_role = p.company_role,
  role = CASE WHEN p.company_role = 'baker' THEN 'employee' ELSE 'admin' END,
  store_id = s.id, city = p.city, phone = p.phone, nationality = p.nationality, bank_name = p.bank,
  birth_date = date '1982-01-01' + (random() * 7000)::int,
  med_book_expires_at = current_date + (random() * 330 - 30)::int,
  patent_expires_at = CASE WHEN p.nationality IN ('Узбекистан', 'Таджикистан')
                           THEN current_date + (random() * 200 - 10)::int END,
  patent_region = CASE WHEN p.nationality IN ('Узбекистан', 'Таджикистан') THEN p.city END,
  debt = CASE WHEN random() < 0.25 THEN 2000 ELSE 0 END
FROM demo_people p JOIN public.stores s ON s.store_number = p.store_no
WHERE u.email = p.email;

UPDATE public.stores s SET
  manager_id = (SELECT id FROM public.users WHERE email = CASE WHEN s.city = 'Москва'
                  THEN 'elena.kuznetsova@demo.tandyr.aics-93.ru' ELSE 'artem.galiev@demo.tandyr.aics-93.ru' END),
  tech_specialist_id = (SELECT id FROM public.users WHERE email = 'dmitry.orlov@demo.tandyr.aics-93.ru');

-- The demo account (admin/owner) gets a home store, so the employee app has history.
UPDATE public.users SET store_id = (SELECT id FROM public.stores WHERE store_number = 4), city = 'Москва'
WHERE email = 'demo@tandyr.aics-93.ru';

INSERT INTO public.user_stores (user_id, store_id)
  SELECT u.id, s.id FROM public.users u JOIN public.stores s
    ON s.id = u.store_id OR (u.company_role IN ('manager', 'tech_specialist') AND s.city = u.city)
         OR u.company_role = 'tech_specialist'
  WHERE u.store_id IS NOT NULL
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_cities (user_id, city_id)
  SELECT DISTINCT us.user_id, s.city_id FROM public.user_stores us JOIN public.stores s ON s.id = us.store_id
  ON CONFLICT DO NOTHING;

-- Shifts: 21 days of closed shifts (~75% attendance), open shifts this morning.
CREATE TEMP TABLE demo_shifts ON COMMIT DROP AS
SELECT u.id AS user_id, u.store_id, s.latitude, s.longitude, d.day,
       (d.day::date + time '07:00' + (random() * 90)::int * interval '1 minute') AT TIME ZONE 'Europe/Moscow' AS start_time,
       round((35 + random() * 50)::numeric, 1)::float8 AS kg,
       random() AS r, (1 + floor(random() * 4))::int AS photo
FROM public.users u
JOIN public.stores s ON s.id = u.store_id
CROSS JOIN generate_series(current_date - 21, current_date - 1, interval '1 day') AS d(day)
WHERE (u.company_role = 'baker' OR u.email = 'demo@tandyr.aics-93.ru') AND random() < 0.75;

INSERT INTO public.shifts (user_id, store_id, start_photo_url, start_lat, start_lng, start_time,
                           end_photo_url, end_lat, end_lng, end_time, production_kg, status,
                           shift_number, accrual, fine, fine_reason, fine_comment)
SELECT user_id, store_id,
       :'photo_base' || '/shift-photos/demo/shift' || photo || '.png', latitude + 0.0002, longitude - 0.0001, start_time,
       :'photo_base' || '/shift-photos/demo/shift' || (photo % 4 + 1) || '.png', latitude, longitude,
       start_time + interval '9 hours' + (r * 120)::int * interval '1 minute',
       kg, 'closed', nextval('shift_number_seq'), 1500 + kg * 30,
       CASE WHEN r < 0.06 THEN 500 WHEN r > 0.97 THEN 1000 ELSE 0 END,
       CASE WHEN r < 0.06 THEN 'Опоздание' WHEN r > 0.97 THEN 'Нарушение санитарных норм' END,
       CASE WHEN r < 0.06 THEN 'Пришёл на 40 минут позже' WHEN r > 0.97 THEN 'Без головного убора на фото' END
FROM demo_shifts ORDER BY start_time;

INSERT INTO public.shifts (user_id, store_id, start_photo_url, start_lat, start_lng, start_time, status, shift_number)
SELECT u.id, u.store_id, :'photo_base' || '/shift-photos/demo/shift' || (1 + floor(random() * 4))::int || '.png',
       s.latitude, s.longitude, now() - interval '3 hours' - (random() * 90)::int * interval '1 minute',
       'open', nextval('shift_number_seq')
FROM public.users u JOIN public.stores s ON s.id = u.store_id
WHERE u.company_role = 'baker' AND random() < 0.6;

-- Production check-ins: two for each closed shift, hourly for open ones.
INSERT INTO public.progress_reports (shift_id, production_kg, reported_at)
SELECT id, round((production_kg * f)::numeric, 1), start_time + (end_time - start_time) * f
FROM public.shifts, unnest(array[0.4, 0.75]) AS f WHERE status = 'closed';
INSERT INTO public.progress_reports (shift_id, production_kg, reported_at)
SELECT id, round((h * (5 + random() * 4))::numeric, 1), start_time + h * interval '1 hour'
FROM public.shifts, generate_series(1, 3) AS h
WHERE status = 'open' AND start_time + h * interval '1 hour' < now();

-- Weekly payroll for the last two full ISO weeks (same formula as salary/actions.ts).
INSERT INTO public.weekly_salaries (user_id, week_number, week_year, period_start, period_end, shift_count,
    total_kg, accrual_kg, accrual_shift, total_accrual, fines_total, current_debt, transferred, debt_written_off, status)
SELECT sh.user_id, extract(week FROM w.start)::int, extract(isoyear FROM w.start)::int, w.start::date, (w.start + 6)::date,
       count(*), sum(sh.production_kg), sum(sh.production_kg) * 30, count(*) * 1500,
       sum(sh.production_kg) * 30 + count(*) * 1500, sum(coalesce(sh.fine, 0)), max(u.debt),
       CASE WHEN w.n = 2 THEN sum(sh.production_kg) * 30 + count(*) * 1500 - sum(coalesce(sh.fine, 0)) - max(u.debt) ELSE 0 END,
       0, CASE WHEN w.n = 2 THEN 'paid' ELSE 'pending' END
FROM (VALUES (1), (2)) AS v(n)
CROSS JOIN LATERAL (SELECT date_trunc('week', current_date)::date - 7 * v.n AS start, v.n) AS w
JOIN public.shifts sh ON sh.status = 'closed'
  AND (sh.start_time AT TIME ZONE 'Europe/Moscow')::date BETWEEN w.start AND w.start + 6
JOIN public.users u ON u.id = sh.user_id
GROUP BY sh.user_id, w.start, w.n;

-- Ingredients: stock that runs out at different speeds, plus deliveries.
UPDATE public.store_resources SET quantity_kg = round((CASE resource
  WHEN 'flour' THEN 120 + random() * 400 WHEN 'sugar' THEN 10 + random() * 40
  WHEN 'salt' THEN 5 + random() * 20 WHEN 'oil' THEN 20 + random() * 80
  WHEN 'dry_milk' THEN 30 + random() * 150 ELSE 1 + random() * 5 END)::numeric, 1);
INSERT INTO public.supplies (store_id, item_name, quantity, unit, supplier, supplied_at)
SELECT s.id, i.item, i.qty, i.unit, i.supplier, current_date - (random() * 20)::int
FROM public.stores s CROSS JOIN (VALUES
  ('Мука пшеничная в/с', 500, 'кг', 'Макфа'), ('Сахар', 50, 'кг', 'Русагро'),
  ('Дрожжи прессованные', 10, 'кг', 'Саф-Нева'), ('Масло подсолнечное', 60, 'л', 'Слобода'),
  ('Пакеты для лепёшек', 2000, 'шт', 'ПакТорг')) AS i(item, qty, unit, supplier);

-- Weekly inventory acts: completed for the past weeks, this week's still pending.
INSERT INTO public.inventory_acts (store_id, user_id, week_number, week_year, scheduled_date, conducted_at, status)
SELECT s.id, s.manager_id, extract(week FROM w.d)::int, extract(isoyear FROM w.d)::int, w.d::date,
       CASE WHEN w.n > 0 AND NOT (w.n = 1 AND s.store_number = 6) THEN w.d + interval '11 hours' END,
       CASE WHEN w.n = 0 THEN 'pending' WHEN w.n = 1 AND s.store_number = 6 THEN 'overdue' ELSE 'completed' END
FROM public.stores s
CROSS JOIN LATERAL (SELECT date_trunc('week', current_date)::date - 1 - 7 * n AS d, n FROM generate_series(0, 2) AS n) AS w;
INSERT INTO public.inventory_act_items (act_id, resource_type, item_name, quantity_kg)
SELECT a.id, r.resource, r.name, round((r.base * (0.6 + random() * 0.8))::numeric, 1)
FROM public.inventory_acts a CROSS JOIN (VALUES
  ('flour', 'Мука', 300), ('sugar', 'Сахар', 25), ('salt', 'Соль', 12), ('oil', 'Масло', 50),
  ('dry_milk', 'Сухое молоко', 90), ('yeast', 'Дрожжи', 3)) AS r(resource, name, base)
WHERE a.status = 'completed';

-- Tech requests in every state.
INSERT INTO public.tech_requests (user_id, store_id, shift_id, photo_url, description, status, created_at,
    assigned_to, taken_at, deadline, resolution_description, resolution_cost, resolved_at)
SELECT u.id, u.store_id,
       (SELECT id FROM public.shifts WHERE user_id = u.id ORDER BY start_time DESC LIMIT 1),
       :'photo_base' || '/tech-request-photos/demo/tech' || (5 + t.n % 2) || '.png', t.descr, t.status,
       now() - t.age, CASE WHEN t.status <> 'pending' THEN tech.id END,
       CASE WHEN t.status <> 'pending' THEN now() - t.age + interval '2 hours' END,
       CASE WHEN t.status <> 'resolved' THEN current_date + 3 END,
       t.resolution, t.cost, CASE WHEN t.status = 'resolved' THEN now() - t.age + interval '1 day' END
FROM (VALUES
  (1, 'alisher.karimov',  'Тандыр не набирает температуру выше 250 °C', 'pending',     interval '5 hours', NULL, NULL),
  (2, 'rustam.nazarov',   'Треснула плита на рабочем столе',            'pending',     interval '1 day', NULL, NULL),
  (3, 'ivan.petrov',      'Тестомес шумит и останавливается',           'in_progress', interval '2 days', NULL, NULL),
  (4, 'zarina.akhmedova', 'Не работает вытяжка над тандыром',           'in_progress', interval '3 days', NULL, NULL),
  (5, 'maria.sokolova',   'Перегорела лампа в зоне выпечки',            'resolved',    interval '6 days', 'Заменили лампу и патрон', 850),
  (6, 'timur.khasanov',   'Сломались весы на выдаче',                   'resolved',    interval '10 days', 'Весы заменены на новые', 6400)
) AS t(n, email, descr, status, age, resolution, cost)
JOIN public.users u ON u.email = t.email || '@demo.tandyr.aics-93.ru'
CROSS JOIN (SELECT id FROM public.users WHERE email = 'dmitry.orlov@demo.tandyr.aics-93.ru') AS tech;

-- Chats: company-wide, support and per-city tech rooms with some history.
INSERT INTO public.chat_rooms (name, type, room_type, city_id) VALUES
  ('Общий чат Tandyr', 'group', 'general', NULL),
  ('Поддержка администрации', 'group', 'admin_support', NULL),
  ('Техслужба — Москва', 'group', 'tech_city', (SELECT id FROM public.cities WHERE name = 'Москва')),
  ('Техслужба — Казань', 'group', 'tech_city', (SELECT id FROM public.cities WHERE name = 'Казань'));
INSERT INTO public.chat_members (room_id, user_id)
  SELECT r.id, u.id FROM public.chat_rooms r JOIN public.users u
    ON r.room_type <> 'tech_city' OR u.city = (SELECT name FROM public.cities WHERE id = r.city_id)
  ON CONFLICT DO NOTHING;
INSERT INTO public.messages (room_id, user_id, content, created_at)
SELECT r.id, u.id, m.content, now() - m.ago
FROM (VALUES
  ('general',       'elena.kuznetsova',  'Доброе утро! Напоминаю: фото рабочего места на старте смены обязательно.', interval '2 days 3 hours'),
  ('general',       'alisher.karimov',   'Понял, сделаю', interval '2 days 2 hours'),
  ('general',       'artem.galiev',      'Казань, в пятницу ждём поставку муки до 10:00.', interval '1 day 5 hours'),
  ('general',       'zarina.akhmedova',  'Хорошо, освободим место на складе', interval '1 day 4 hours'),
  ('general',       'elena.kuznetsova',  'Выработка за неделю отличная, спасибо всем!', interval '6 hours'),
  ('admin_support', 'farida.abdullaeva', 'Подскажите, когда придёт зарплата за прошлую неделю?', interval '1 day 2 hours'),
  ('admin_support', 'elena.kuznetsova',  'Перевод сегодня до 18:00.', interval '1 day 1 hour'),
  ('tech_city',     'ivan.petrov',       'Тестомес снова остановился, заявку создал', interval '2 days'),
  ('tech_city',     'dmitry.orlov',      'Приеду завтра утром, посмотрю', interval '1 day 20 hours')
) AS m(room_type, email, content, ago)
JOIN public.users u ON u.email = m.email || '@demo.tandyr.aics-93.ru'
JOIN public.chat_rooms r ON r.room_type = m.room_type
  AND (r.room_type <> 'tech_city' OR r.city_id = (SELECT id FROM public.cities WHERE name = u.city));

COMMIT;
SQL

psql_db -tA -F' ' -c "SELECT 'stores', count(*) FROM public.stores UNION ALL SELECT 'employees', count(*) FROM public.users
  UNION ALL SELECT 'shifts', count(*) FROM public.shifts UNION ALL SELECT 'open shifts', count(*) FROM public.shifts WHERE status = 'open'
  UNION ALL SELECT 'tech requests', count(*) FROM public.tech_requests UNION ALL SELECT 'messages', count(*) FROM public.messages"
