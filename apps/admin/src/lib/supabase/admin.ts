import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client using the service role key.
 * Bypasses RLS — use ONLY in server actions for admin operations
 * (user management, cross-tenant data access, etc.)
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
