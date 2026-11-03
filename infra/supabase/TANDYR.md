# Tandyr: свой Supabase в Docker

Бэкенд Tandyr (Postgres, Auth, Storage, Realtime, edge-функции) поднимается
из этой папки на любой машине с Docker, без аккаунта и облака Supabase.

- Апстрим: официальный self-hosted стек Supabase, версия в `UPSTREAM_VERSION`.
  Его файлы не правим, чтобы `update.sh` обновлял их чисто.
- Всё своё лежит в `docker-compose.tandyr.yml` и `scripts/`.
- Схема БД берётся из `../../supabase/migrations`, функции из `../../supabase/functions`.

## Локально (macOS, Docker Desktop)

```sh
cd infra/supabase
sh scripts/init-env.sh            # .env с новыми секретами
sh scripts/pull-images.sh         # образы, с зеркалами, если Docker Hub тормозит
sh run.sh start                   # 11 сервисов, ждёт healthy
sh scripts/migrate.sh             # миграции 001…NNN, повторно применяет только новые
sh scripts/schedule-functions.sh  # cron для напоминаний и инвентаризаций
sh scripts/create-admin.sh you@example.com "Имя Фамилия"
sh scripts/app-env.sh            # apps/admin/.env.local (+ допишите NEXT_PUBLIC_YANDEX_MAPS_KEY)
```

Затем `npm run dev` в `apps/admin` открывает http://localhost:3000.

| Что | Адрес |
|---|---|
| API (для приложения) | http://localhost:8000 |
| Studio | http://localhost:8000 (логин и пароль: `sh run.sh secrets`) |
| Postgres | `127.0.0.1:55432`, пользователь `postgres` |

Все порты слушают только `127.0.0.1`. Пароль первого админа лежит в
`.admin-credentials` (в gitignore, права 600, как и `.env`).

Публичная регистрация в Auth (`/auth/v1/signup`) закрыта (`DISABLE_SIGNUP=true`):
все аккаунты заводит сервер через `admin.createUser`. Edge-функции принимают
только ключ service role, их вызывает pg_cron.

Сбросить всё к чистой БД:
`docker compose down -v && rm -rf volumes/db/data .env .admin-credentials`

## На VPS (Ubuntu, от 2 vCPU / 4 ГБ RAM / 40 ГБ)

1. Поставить Docker Engine и плагин compose, склонировать репозиторий.
2. Направить DNS двух доменов на сервер, например `api.tandyr.ru` (Supabase)
   и `tandyr.ru` (админка).
3. Выполнить `sh scripts/init-env.sh api.tandyr.ru tandyr.ru`. Скрипт включит
   Caddy с автоматическим TLS на API-домене и закроет порт 8000 снаружи.
4. Заполнить `SMTP_*` в `.env`, иначе письма сброса пароля не уйдут.
5. Дальше те же шаги, что и локально: `pull-images`, `run.sh start`, `migrate`,
   `schedule-functions`, `create-admin`.
6. Админка: `npm ci && npm run build` в корне. Запуск:
   `node apps/admin/.next/standalone/apps/admin/server.js`. Рядом с бандлом нужно
   скопировать `apps/admin/.next/static` и `apps/admin/public`. Перед запуском
   поставить `NEXT_PUBLIC_*` при сборке и `PORT`. Держать под systemd или pm2,
   снаружи проксировать через Caddy на домен приложения.
7. После запуска выключить «Открытую регистрацию админов» в Настройках
   (миграция 017 по умолчанию включает её).

## На VPS с общим Caddy (текущий прод: tandyr.aics-93.ru)

Сервер 201.34.149.163 (Timeweb, Москва) уже обслуживает несколько сайтов
одним контейнером `supabase-caddy` в сети `supabase_default`, порты 80/443
заняты им. Поэтому Tandyr ставится без своего Caddy, на одном домене:
пути `/auth/v1`, `/rest/v1`, `/realtime/v1`, `/storage/v1` уходят в gateway,
всё остальное в админку. `/functions/v1` наружу не открыт: функции вызывает
только pg_cron изнутри стека.

```sh
cd /opt/tandyr/infra/supabase
SHARED_PROXY=1 API_BIND=172.18.0.1 sh scripts/init-env.sh tandyr.aics-93.ru
sh scripts/pull-images.sh && sh run.sh start
sh scripts/migrate.sh && sh scripts/schedule-functions.sh
sh scripts/create-admin.sh owner@example.com "Имя Фамилия"
sh scripts/app-env.sh ../admin/.env
docker network create tandyr_edge && docker network connect tandyr_edge supabase-caddy
docker compose -f ../admin/docker-compose.yml up -d --build
```

- `172.18.0.1` — шлюз сети `supabase_default`. Gateway Tandyr слушает только
  `172.18.0.1:8100`: Caddy до него дотягивается, из интернета адрес не виден.
  Caddy нельзя подключать к сети `tandyr-supabase_default`: имена `api-gw`,
  `auth` и другие совпали бы с соседним Supabase.
- Studio, postgres-meta и Supavisor выключены (`docker-compose.vps.yml`),
  это экономит около 600 МБ. Studio по требованию:
  `docker compose --profile studio up -d studio meta`, затем SSH-туннель.
- Админка работает в контейнере `tandyr-admin` в отдельной сети `tandyr_edge`,
  куда кроме неё подключён только Caddy. В `supabase_default` её не кладём:
  там базы соседних проектов. Подключение Caddy к `tandyr_edge` слетает, если
  контейнер `supabase-caddy` пересоздать (`compose up` в `/opt/supabase-src`).
  Тогда повторите `docker network connect tandyr_edge supabase-caddy`.
- Блок для Caddy лежит в `caddy/tandyr.Caddyfile`. Его надо дописать в
  `/opt/supabase-src/docker/volumes/proxy/caddy/Caddyfile`, предварительно
  сохранив бэкап `Caddyfile.bak-<дата>`, затем выполнить
  `docker exec supabase-caddy caddy validate --config /etc/caddy/Caddyfile` и
  `docker exec supabase-caddy caddy reload --config /etc/caddy/Caddyfile`.
- Обновить код: rsync в `/opt/tandyr`, затем `sh scripts/migrate.sh` и
  пересобрать админку той же командой `up -d --build`.

## Публичное демо

Пока в базе только тестовые данные, https://tandyr.aics-93.ru открыт без
пароля. Каждый посетитель без сессии автоматически входит как
`demo@tandyr.aics-93.ru` (admin/owner). Это делает `/api/demo-login`:
сервер выпускает magic link через service role и сразу подтверждает его,
письма никуда не уходят. Включается переменной `DEMO_USER_ID` в
`infra/admin/.env`. Страницы `/login`, `/signup` и `/invite` в режиме демо
недоступны, ответы помечены `X-Robots-Tag: noindex`.

**Закрыть демо до загрузки реальных данных.** Посетитель мог сохранить себе
доступ: скопировать refresh-токен, сменить пароль демо-аккаунта, завести
своих админов или инвайты. Поэтому одной переменной мало:

1. Удалить `DEMO_USER_ID` из `infra/admin/.env` и выполнить
   `docker compose -f infra/admin/docker-compose.yml up -d`. Именно `up`:
   при `restart` контейнер не перечитывает env.
2. Лучше всего начать базу с нуля: `docker compose down -v && rm -rf volumes/db/data`
   в `infra/supabase`, затем `run.sh start`, `migrate`, `schedule-functions`,
   `create-admin`. Ключи в `.env` при этом сохранятся.
3. Если базу не сносить, то:
   - удалить демо-пользователя и всех, кто создан за время демо;
   - проверить `role` и `company_role` у оставшихся;
   - удалить инвайты;
   - выставить `open_signup_enabled = false`;
   - удалить файлы из Storage через API, а не SQL-запросом.

Бэкапы: каталог `volumes/db/data` (Postgres) плюс docker-том
`tandyr-supabase_storage-data` (файлы). Самое простое — ночной
`docker compose exec db pg_dump -U postgres` и `rsync` тома.

## Отличия от облачного Supabase

- Имена контейнеров и проекта `tandyr-*`: стек уживается с другими
  установками Supabase на той же машине.
- Файлы Storage лежат в именованном томе: bind-mount на macOS не поддерживает
  extended attributes, и Storage падал бы с ошибкой 500.
- Расписания функций (раньше настраивались в дашборде) заданы через
  `pg_cron` + `pg_net`. Ключ service role хранится в Vault.
- `utils/upgrade-pg17.sh` из апстрима ищет контейнер `supabase-db`. Для нашего
  стека в нём надо подставить `tandyr-db`.
