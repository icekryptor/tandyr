import { notFound } from 'next/navigation';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { SignupForm } from './signup-form';

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'open_signup_enabled')
    .single();
  if (data?.value !== 'true') notFound();
  return <SignupForm />;
}
