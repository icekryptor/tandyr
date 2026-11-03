#!/bin/sh
#
# Apply supabase/migrations/*.sql to the self-hosted stack, in order, once each.
# Applied versions are tracked in supabase_migrations.schema_migrations (the
# same table the Supabase CLI uses), so re-running only applies new files.
#
# Usage (from infra/supabase, stack running):
#   sh scripts/migrate.sh
#
set -e
cd "$(dirname "$0")/.."
MIGRATIONS_DIR=../../supabase/migrations

psql_db() {
    docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"
}

psql_db <<'SQL'
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version text PRIMARY KEY,
    name text,
    statements text[]
);
SQL

applied=0
for file in "$MIGRATIONS_DIR"/*.sql; do
    base=$(basename "$file" .sql)
    # Names are interpolated into SQL below; only allow NNN_snake_case.
    printf '%s' "$base" | grep -Eq '^[0-9]+_[a-z0-9_]+$' \
        || { echo "Bad migration file name: $base (expected NNN_snake_case.sql)" >&2; exit 1; }
    version=${base%%_*}
    name=${base#*_}
    done_already=$(psql_db -tA -c "SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '$version'")
    [ "$done_already" = "1" ] && continue

    echo "Applying $base"
    # One transaction per file: the migration and its bookkeeping row land together.
    { echo "BEGIN;"; cat "$file"; echo
      echo "INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('$version', '$name');"
      echo "COMMIT;"; } | psql_db
    applied=$((applied + 1))
done

# PostgREST caches the schema; make it see new tables right away.
psql_db -c "NOTIFY pgrst, 'reload schema';"
echo "Done: $applied migration(s) applied."
