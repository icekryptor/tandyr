import { notFound } from 'next/navigation';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { COMPANY_ROLE_LABELS } from '@tandyr/shared';
import { InviteForm } from './invite-form';

export const dynamic = 'force-dynamic';

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: invite } = await admin
    .from('invites')
    .select('email, store_id, company_role, used_at, expires_at')
    .eq('token', token)
    .single();

  if (!invite) notFound();
  if (invite.used_at) return <InvalidPage reason="Эта ссылка уже использована." />;
  if (isExpired(invite.expires_at)) {
    return <InvalidPage reason="Срок действия ссылки истёк. Попросите менеджера прислать новую." />;
  }

  // Avoid leaking the full store roster: if the invite already binds a
  // store, fetch only that one for the readonly display. Otherwise fetch
  // all for the dropdown.
  let stores: { id: string; name: string }[] = [];
  if (invite.store_id) {
    const { data } = await admin
      .from('stores')
      .select('id, name')
      .eq('id', invite.store_id)
      .single();
    if (data) stores = [data];
  } else {
    const { data } = await admin.from('stores').select('id, name').order('name');
    stores = data ?? [];
  }

  return (
    <InviteForm
      token={token}
      preEmail={invite.email ?? ''}
      preStoreId={invite.store_id ?? ''}
      preRole={invite.company_role ?? ''}
      stores={stores}
      roleLabels={COMPANY_ROLE_LABELS}
    />
  );
}

function InvalidPage({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-bold">Т</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Ссылка недействительна</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">{reason}</p>
        </div>
      </div>
    </div>
  );
}
