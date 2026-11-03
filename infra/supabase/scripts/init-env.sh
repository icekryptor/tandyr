#!/bin/sh
#
# Create infra/supabase/.env for a fresh Tandyr install: copy .env.example,
# generate all secrets and JWT API keys, apply Tandyr defaults.
#
# Usage (from infra/supabase):
#   sh scripts/init-env.sh                      # local: http://localhost:8000, app on :3000
#   sh scripts/init-env.sh api.example.com app.example.com
#                                               # VPS: Caddy TLS on the API domain
#   SHARED_PROXY=1 API_BIND=172.18.0.1 sh scripts/init-env.sh app.example.com
#                                               # VPS whose proxy is already running:
#                                               # API and app share one domain, the
#                                               # gateway listens on API_BIND:8100
#
# Secrets are written to .env only, never printed. Read them later with
#   sh run.sh secrets
#
set -e
cd "$(dirname "$0")/.."

if [ -f .env ]; then
    echo ".env already exists; refusing to overwrite secrets of a running stack." >&2
    exit 1
fi

API_DOMAIN="$1"
APP_DOMAIN="$2"

umask 077
cp .env.example .env
chmod 600 .env
sh utils/generate-keys.sh --update-env >/dev/null
# generate-keys.sh keeps a copy of the previous .env; it holds secrets after a re-run.
rm -f .env.old

set_env() {
    # Portable in-place replace of KEY=... (BSD and GNU sed).
    sed -i.bak "s|^$1=.*|$1=$2|" .env && rm -f .env.bak
}

# The app never calls the public /auth/v1/signup: every account is created
# server-side with admin.createUser (signup page, invites, employees screen).
# Leaving it open lets anyone with the anon key register.
set_env DISABLE_SIGNUP true
set_env ENABLE_PHONE_SIGNUP false
# Admin creates employees and the app has no confirmation step of its own.
set_env ENABLE_EMAIL_AUTOCONFIRM true
# Gateway-level JWT check for /functions/v1; each function also requires the
# service-role key (supabase/functions/_shared/auth.ts).
set_env FUNCTIONS_VERIFY_JWT true

if [ -n "$API_DOMAIN" ]; then
    APP_URL="https://${APP_DOMAIN:-$API_DOMAIN}"
    if [ -n "$SHARED_PROXY" ]; then
        # The host proxy routes /auth/v1, /rest/v1, ... to the gateway and the
        # rest to the app (see TANDYR.md); no Caddy of our own.
        set_env COMPOSE_FILE docker-compose.yml:docker-compose.tandyr.yml:docker-compose.vps.yml
        printf '\n# Tandyr: gateway address for the host proxy (docker-compose.vps.yml)\nTANDYR_API_BIND=%s\nTANDYR_API_PORT=%s\n' \
            "${API_BIND:-127.0.0.1}" "${API_PORT:-8100}" >> .env
    else
        set_env COMPOSE_FILE docker-compose.yml:docker-compose.tandyr.yml:docker-compose.caddy.yml
        set_env PROXY_DOMAIN "$API_DOMAIN"
    fi
    set_env SUPABASE_PUBLIC_URL "https://$API_DOMAIN"
    set_env API_EXTERNAL_URL "https://$API_DOMAIN/auth/v1"
    set_env SITE_URL "$APP_URL"
    set_env ADDITIONAL_REDIRECT_URLS "$APP_URL/**"
else
    set_env COMPOSE_FILE docker-compose.yml:docker-compose.tandyr.yml
    set_env ADDITIONAL_REDIRECT_URLS "http://localhost:3000/**"
fi

echo "Wrote $(pwd)/.env"
echo "Next: sh run.sh start && sh scripts/migrate.sh"
echo "Real e-mail (password reset) needs SMTP_* in .env — see TANDYR.md."
