import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Sidebar } from '@/components/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate the entire admin panel by role. Every /dashboard/* page is a child
  // of this layout, so a single check protects them all. Without it, any
  // authenticated employee (the PWA now gives every baker a session) could
  // read employee PII, chats, salaries, etc.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Use the admin client to read the caller's role (bypasses RLS recursion).
  const admin = createAdminClient();
  const { data: me } = await admin
    .from('users')
    .select('role, company_role')
    .eq('id', user.id)
    .single();

  const isSystemAdmin = me?.role === 'admin';
  const isBusinessAdmin = ['owner', 'admin'].includes(me?.company_role ?? '');
  if (!me || (!isSystemAdmin && !isBusinessAdmin)) {
    redirect('/employee');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
