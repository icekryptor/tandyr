#!/bin/sh
#
# Write the Supabase variables apps/admin needs, taken from this stack's .env,
# into apps/admin/.env.local (mode 600). Other lines already in that file, such
# as NEXT_PUBLIC_YANDEX_MAPS_KEY, are kept.
#
# Usage (from infra/supabase):
#   sh scripts/app-env.sh [path-to-env-file]   # default: ../../apps/admin/.env.local
#
set -e
umask 077
cd "$(dirname "$0")/.."
OUT="${1:-../../apps/admin/.env.local}"

env_get() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }

kept=""
[ -f "$OUT" ] && kept=$(grep -vE '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=' "$OUT" || true)

{
    echo "NEXT_PUBLIC_SUPABASE_URL=$(env_get SUPABASE_PUBLIC_URL)"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$(env_get ANON_KEY)"
    echo "SUPABASE_SERVICE_ROLE_KEY=$(env_get SERVICE_ROLE_KEY)"
    [ -n "$kept" ] && printf '%s\n' "$kept"
} > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
chmod 600 "$OUT"
echo "Wrote $OUT"
