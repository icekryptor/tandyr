#!/bin/sh
#
# Schedule Tandyr edge functions with pg_cron + pg_net (replaces Supabase
# Dashboard > Edge Functions > Schedules). Idempotent: re-running updates jobs.
#
# Schedules (UTC) come from the headers of supabase/functions/*/index.ts.
# The service-role key is kept in Supabase Vault, not in cron.job.command.
#
# Usage (from infra/supabase, stack running and migrated):
#   sh scripts/schedule-functions.sh
#
set -e
cd "$(dirname "$0")/.."

SERVICE_ROLE_KEY=$(grep -E '^SERVICE_ROLE_KEY=' .env | cut -d= -f2-)

# The key goes in on stdin (\set), not argv, so `ps` never shows it.
{ printf '\\set key %s\n' "$SERVICE_ROLE_KEY"; cat <<'SQL'; } |
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Vault secret read by the jobs at run time.
DELETE FROM vault.secrets WHERE name = 'tandyr_service_role_key';
SELECT vault.create_secret(:'key', 'tandyr_service_role_key') \gset

CREATE OR REPLACE FUNCTION public.invoke_edge_function(fn text, body jsonb DEFAULT '{}')
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Allowlist: fn is concatenated into a URL that carries the service-role key.
  IF fn NOT IN ('send-progress-reminder', 'send-push-notification', 'weekly-inventory-scheduler') THEN
    RAISE EXCEPTION 'unknown edge function: %', fn;
  END IF;
  -- api-gw is the in-network gateway; functions live behind /functions/v1.
  RETURN net.http_post(
    url := 'http://api-gw:8000/functions/v1/' || fn,
    body := body,
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'tandyr_service_role_key'))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.invoke_edge_function(text, jsonb) FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('tandyr-progress-reminder', '0 5,10 * * *',
    $$SELECT public.invoke_edge_function('send-progress-reminder')$$);
SELECT cron.schedule('tandyr-inventory-create', '0 8 * * 0',
    $$SELECT public.invoke_edge_function('weekly-inventory-scheduler', '{"action":"create"}')$$);
SELECT cron.schedule('tandyr-inventory-overdue', '0 0 * * 1',
    $$SELECT public.invoke_edge_function('weekly-inventory-scheduler', '{"action":"mark_overdue"}')$$);
SQL
    docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 -q

docker compose exec -T db psql -U postgres -tA \
    -c "SELECT jobname || '  ' || schedule FROM cron.job WHERE jobname LIKE 'tandyr-%' ORDER BY jobname"
