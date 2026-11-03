#!/bin/sh
#
# Create the first Tandyr administrator (role=admin, company_role=owner) on a
# fresh database. Everyone else is invited from the admin panel afterwards.
#
# Usage (from infra/supabase, stack running and migrated):
#   sh scripts/create-admin.sh owner@example.com "Имя Фамилия"
#   ADMIN_PASSWORD='...' sh scripts/create-admin.sh owner@example.com
#
# Without ADMIN_PASSWORD a random password is generated and saved to
# .admin-credentials (mode 600, gitignored) instead of being printed.
#
set -e
cd "$(dirname "$0")/.."

EMAIL="$1"
FULL_NAME="${2:-Администратор}"
[ -n "$EMAIL" ] || { echo "Usage: sh scripts/create-admin.sh <email> [full name]" >&2; exit 1; }

env_get() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }
# Behind a shared host proxy the gateway listens on TANDYR_API_BIND:TANDYR_API_PORT.
if [ -n "$(env_get TANDYR_API_PORT)" ]; then
    API_URL="http://$(env_get TANDYR_API_BIND):$(env_get TANDYR_API_PORT)"
else
    API_URL="http://127.0.0.1:$(env_get API_GW_HTTP_PORT)"
fi
SERVICE_ROLE_KEY=$(env_get SERVICE_ROLE_KEY)

umask 077
if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)
    # Saved before any API call, so a later failure never loses it.
    printf 'email=%s\npassword=%s\n' "$EMAIL" "$ADMIN_PASSWORD" > .admin-credentials
    generated=1
fi
export ADMIN_PASSWORD

# Secrets travel via a 600 header file and stdin, never argv (visible in `ps`).
headers=$(mktemp)
trap 'rm -f "$headers"' EXIT
printf 'apikey: %s\nAuthorization: Bearer %s\nContent-Type: application/json\n' \
    "$SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY" > "$headers"

response=$(jq -n --arg e "$EMAIL" --arg n "$FULL_NAME" \
        '{email: $e, password: env.ADMIN_PASSWORD, email_confirm: true, user_metadata: {full_name: $n}}' |
    curl -sS -X POST "$API_URL/auth/v1/admin/users" -H @"$headers" --data-binary @-)
user_id=$(printf '%s' "$response" | jq -r '.id // empty')
printf '%s' "$user_id" | grep -Eq '^[0-9a-f-]{36}$' || { echo "Auth API error: $response" >&2; exit 1; }

# handle_new_user() created an 'employee' profile; promote it (owner unlocks everything).
docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 -q \
    -c "UPDATE public.users SET role = 'admin', company_role = 'owner' WHERE id = '$user_id';"

if [ -n "$generated" ]; then
    echo "Admin $EMAIL created; password saved to $(pwd)/.admin-credentials"
else
    echo "Admin $EMAIL created."
fi
