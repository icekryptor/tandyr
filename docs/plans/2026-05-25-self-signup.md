# Self-signup, Forgot password & Invites — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship three independent features that remove Claude from the admin-account-creation loop: (1) forgot-password recovery, (2) temporary open admin signup with a kill-switch, (3) admin-issued invite links for employee onboarding.

**Architecture:** Three phases, each independently shippable + deployable. Phase 1 uses Supabase's built-in recovery API and adds two web routes only. Phase 2 adds a `/signup` route gated by a `settings` row, with the actual user creation done in a server action using the service role (so we control `email_confirm`). Phase 3 adds an `invites` table + an `/invite/[token]` route with a parallel server action.

**Tech Stack:** Next.js 16 App Router (admin web), Supabase Auth + Postgres + RLS, server actions with `createAdminClient` (service role) for user creation, client component with anon key for `resetPasswordForEmail`.

**Verification discipline (no unit-test framework in repo):**
- `npx tsc --noEmit` in `apps/admin/`
- `npx eslint .` in `apps/admin/` — must stay at 0 errors
- Playwright via MCP on `https://tandyr.vercel.app` after each phase ships
- SQL inspection via Supabase MCP `execute_sql` to confirm migrations / row state

**Design reference:** [`docs/plans/2026-05-25-self-signup-design.md`](./2026-05-25-self-signup-design.md)

---

## Phase 1 — Forgot password

No DB changes. Two new routes + one link.

### Task 1.1: Create `/forgot-password` route

**Files:**
- Create: `apps/admin/src/app/(auth)/forgot-password/page.tsx`

**Step 1: Create the page**

Mirror the look of the existing `/login` page (Russian UI, primary-coloured logo block, `card` background). Use a client component because we call `resetPasswordForEmail` from the browser.

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/reset-password`,
    });
    // Anti-enumeration: same UI regardless of whether the email exists
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
            Т
          </div>
          <h1 className="text-xl font-bold">Восстановление доступа</h1>
          <p className="text-sm text-muted-foreground text-center">
            Введите email — пришлём ссылку для сброса пароля.
          </p>
        </div>

        {submitted ? (
          <div className="text-sm text-foreground bg-muted rounded-xl p-4">
            Если такой email зарегистрирован — на него отправлено письмо со
            ссылкой для сброса пароля. Проверьте «Входящие» и папку «Спам».
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                placeholder="admin@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
            >
              {loading ? 'Отправка…' : 'Отправить ссылку'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Назад ко входу
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Typecheck**

Run from `apps/admin/`:
```
npx tsc --noEmit
```
Expected: clean exit.

**Step 3: Commit**

```bash
git add "apps/admin/src/app/(auth)/forgot-password/page.tsx"
git commit -m "feat(admin): /forgot-password page (UI only)"
```

---

### Task 1.2: Create `/reset-password` route

**Files:**
- Create: `apps/admin/src/app/(auth)/reset-password/page.tsx`

This is the page the email link points to. Supabase populates `?code=…` in the URL; when the page loads, calling `supabase.auth.exchangeCodeForSession(code)` establishes a recovery session, after which `updateUser({ password })` works.

**Step 1: Create the page**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Exchange the `code` query param for a recovery session.
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('Ссылка недействительна. Запросите новую через «Забыли пароль?».');
      return;
    }
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: exErr }) => {
      if (exErr) {
        setError('Ссылка устарела или уже использована. Запросите новую.');
      } else {
        setSessionReady(true);
      }
    });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов.');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    router.replace('/login?reset=1');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
            Т
          </div>
          <h1 className="text-xl font-bold">Новый пароль</h1>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        {sessionReady && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Новый пароль</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Повторите пароль</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
            >
              {loading ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Typecheck**

Run from `apps/admin/`:
```
npx tsc --noEmit
```
Expected: clean exit.

**Step 3: Commit**

```bash
git add "apps/admin/src/app/(auth)/reset-password/page.tsx"
git commit -m "feat(admin): /reset-password page handles Supabase recovery flow"
```

---

### Task 1.3: Add "Забыли пароль?" link to `/login`

**Files:**
- Modify: `apps/admin/src/app/(auth)/login/page.tsx` (or `login-client.tsx` — read first to confirm structure)

**Step 1: Read the existing login file**

```
Read apps/admin/src/app/(auth)/login/<file>.tsx
```

**Step 2: Insert link**

Below the submit button, add:

```tsx
<div className="text-center pt-2">
  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
    Забыли пароль?
  </Link>
</div>
```

Ensure `import Link from 'next/link';` exists at the top of the file (it likely does; if not, add it).

**Step 3: Typecheck + lint**

```
cd apps/admin && npx tsc --noEmit && npx eslint .
```
Expected: clean.

**Step 4: Commit**

```bash
git add "apps/admin/src/app/(auth)/login/"
git commit -m "feat(admin): surface forgot-password link on login"
```

---

### Task 1.4: Verify Phase 1 end-to-end on prod

**Step 1: Push and deploy**

```bash
git push origin main
# Wait for auto-deploy (or run manual)
cd /Users/vasilijaistov/Desktop/continuum/tandyr && npx vercel@latest --prod --yes
```

**Step 2: Smoke via Playwright MCP**

- `browser_navigate https://tandyr.vercel.app/login` → expect "Забыли пароль?" link visible
- click → expect URL becomes `/forgot-password`
- fill email `dpmnstudio@gmail.com` → submit → expect success message
- check Supabase auth logs via MCP `get_logs` for a `recovery` event in the last 5 minutes

**Step 3: Update task as complete in TaskUpdate. Phase 1 done.**

---

## Phase 2 — Open admin signup (temporary, toggleable)

### Task 2.1: Migration 017 — `open_signup_enabled` setting

**Files:**
- Create: `supabase/migrations/017_open_signup_setting.sql`

**Step 1: Write the migration**

```sql
-- ============================================================
-- 017: Open admin signup toggle
-- ============================================================
-- A single row in `settings` controls whether /signup is reachable.
-- Default 'true' for the launch window; flip to 'false' from the
-- Settings UI when the team is established.
-- ============================================================

INSERT INTO public.settings (key, value, description)
VALUES (
  'open_signup_enabled',
  'true',
  'Когда true — страница /signup открыта для регистрации админов. Временная фича на запуск. Выключите когда команда сформирована.'
)
ON CONFLICT (key) DO NOTHING;
```

**Step 2: Apply via Supabase MCP**

Call `mcp__…__apply_migration` with `name='017_open_signup_setting'` and the SQL above.

**Step 3: Verify the row exists**

```sql
SELECT key, value FROM settings WHERE key = 'open_signup_enabled';
```
Expected: one row, value `'true'`.

**Step 4: Commit**

```bash
git add supabase/migrations/017_open_signup_setting.sql
git commit -m "feat(db): migration 017 — open_signup_enabled toggle"
```

---

### Task 2.2: Server action for admin signup

**Files:**
- Create: `apps/admin/src/app/(auth)/signup/actions.ts`

**Step 1: Write the action**

The action uses the service-role client so we control `email_confirm` (skip email verification) and so the `public.users` insert isn't blocked by RLS. It also re-reads `open_signup_enabled` server-side so the gate can't be bypassed by hitting the action directly.

```ts
'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';

type Result = { ok: true } | { ok: false; error: string };

export async function signUpAdmin(formData: FormData): Promise<Result> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();

  if (!email || !password || !fullName) {
    return { ok: false, error: 'Заполните все поля.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Пароль должен быть не короче 6 символов.' };
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Re-check the toggle on the server so the gate cannot be bypassed.
  const { data: settingRow } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'open_signup_enabled')
    .single();
  if (settingRow?.value !== 'true') {
    return { ok: false, error: 'Регистрация сейчас закрыта.' };
  }

  // Create the auth user with email already confirmed.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? 'Не удалось создать аккаунт.' };
  }

  // Insert public.users row with role=admin
  const { error: insErr } = await admin.from('users').insert({
    id: created.user.id,
    email,
    full_name: fullName,
    role: 'admin',
    is_active: true,
  });
  if (insErr) {
    // Roll back the auth user to avoid orphan
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Ошибка профиля: ${insErr.message}` };
  }

  return { ok: true };
}
```

**Step 2: Typecheck**

```
cd apps/admin && npx tsc --noEmit
```
Expected: clean.

**Step 3: Commit**

```bash
git add "apps/admin/src/app/(auth)/signup/actions.ts"
git commit -m "feat(admin): server action for open admin signup"
```

---

### Task 2.3: `/signup` page

**Files:**
- Create: `apps/admin/src/app/(auth)/signup/page.tsx`

**Step 1: Write the page**

Server component to read the toggle, render either 404 or the form (client component below).

```tsx
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
```

**Step 2: Write the client form**

Create: `apps/admin/src/app/(auth)/signup/signup-form.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUpAdmin } from './actions';

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signUpAdmin(new FormData(e.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace('/login?signup=1');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
            Т
          </div>
          <h1 className="text-xl font-bold">Регистрация админа</h1>
          <p className="text-xs text-muted-foreground text-center">
            Временная страница на период запуска.
          </p>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Имя</label>
            <input
              name="full_name"
              type="text"
              required
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Пароль</label>
            <input
              name="password"
              type="password"
              minLength={6}
              required
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
          >
            {loading ? 'Создание…' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Уже есть аккаунт? Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Typecheck + lint**

```
cd apps/admin && npx tsc --noEmit && npx eslint .
```
Expected: clean.

**Step 4: Commit**

```bash
git add "apps/admin/src/app/(auth)/signup/"
git commit -m "feat(admin): /signup page gated by open_signup_enabled"
```

---

### Task 2.4: Settings UI toggle for `open_signup_enabled`

**Files:**
- Modify: `apps/admin/src/app/(dashboard)/settings/settings-client.tsx` (read first)
- Modify: `apps/admin/src/app/(dashboard)/settings/actions.ts` (likely exists; read first)
- Modify: `apps/admin/src/app/(dashboard)/settings/page.tsx` (already passes a `settings` map; confirm the new key is included)

**Step 1: Read existing settings code**

```
Read apps/admin/src/app/(dashboard)/settings/settings-client.tsx
Read apps/admin/src/app/(dashboard)/settings/actions.ts
```

**Step 2: Add a boolean-style row**

The settings table stores strings. Render a checkbox / toggle that maps `'true'` ↔ `'false'`. Add a card or row near the bottom of the existing settings UI with a clear warning style (because it's an open-signup switch):

```tsx
<div className="bg-card border border-destructive/30 rounded-2xl p-5 space-y-3">
  <div className="flex items-start justify-between gap-3">
    <div>
      <h3 className="text-sm font-semibold text-foreground">
        Открытая регистрация админов
      </h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-md">
        Когда включено — на странице <code>/signup</code> любой может
        зарегистрироваться как админ. Используйте только на время запуска.
      </p>
    </div>
    <label className="inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        defaultChecked={settings.open_signup_enabled === 'true'}
        onChange={(e) =>
          startTransition(async () => {
            await updateSetting('open_signup_enabled', e.target.checked ? 'true' : 'false');
            router.refresh();
          })
        }
      />
    </label>
  </div>
</div>
```

If `actions.ts` doesn't expose `updateSetting(key, value)`, add it:

```ts
export async function updateSetting(key: string, value: string) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  await admin.from('settings').upsert({ key, value }, { onConflict: 'key' });
}
```

**Step 3: Typecheck + lint**

```
cd apps/admin && npx tsc --noEmit && npx eslint .
```
Expected: clean.

**Step 4: Commit**

```bash
git add "apps/admin/src/app/(dashboard)/settings/"
git commit -m "feat(admin): settings toggle for open_signup_enabled"
```

---

### Task 2.5: Verify Phase 2 end-to-end on prod

**Step 1: Push + deploy**

```bash
git push origin main
cd /Users/vasilijaistov/Desktop/continuum/tandyr && npx vercel@latest --prod --yes
```

**Step 2: Smoke via Playwright**

- Open `https://tandyr.vercel.app/signup` (unauthenticated). Expect signup form visible.
- Fill: name=`Test Admin`, email=`<temp-throwaway>@…`, password=`Tandyr2026Test`. Submit.
- Expect redirect to `/login?signup=1`. Log in with the new credentials. Expect to land on `/overview`.
- Log out. Log in as `dpmnstudio@gmail.com / Tandyr2026`. Open `/settings`. Toggle "Открытая регистрация админов" OFF.
- Re-open `/signup`. Expect 404.
- Run `mcp__…__execute_sql` to clean up the throwaway user:
  ```sql
  DELETE FROM public.users WHERE email = '<temp-throwaway>@…';
  -- (auth.users row will be orphaned; either delete via auth.admin.deleteUser
  --  in a quick script, or accept it for the throwaway.)
  ```

**Step 3: Phase 2 done. Update TaskList.**

---

## Phase 3 — Employee invites

### Task 3.1: Migration 018 — `invites` table

**Files:**
- Create: `supabase/migrations/018_invites.sql`

**Step 1: Write the migration**

```sql
-- ============================================================
-- 018: Employee invites
-- ============================================================
-- Admin-issued tokens that pre-bind a store + company_role and let
-- the recipient self-register without admin intervention.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invites (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token           uuid NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  email           text,                       -- optional pre-fill
  store_id        uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  company_role    text CHECK (company_role IN ('baker','manager','tech_specialist','admin','owner')),
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at         timestamptz,
  used_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- The /invite/[token] page is unauthenticated and reads by token.
-- The token is the secret; we accept that anyone with it can read its row.
CREATE POLICY "Anyone can read invite" ON public.invites
  FOR SELECT USING (true);

CREATE POLICY "Admins manage invites" ON public.invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

**Step 2: Apply via Supabase MCP**

Call `mcp__…__apply_migration` with `name='018_invites'`.

**Step 3: Verify schema**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='invites'
ORDER BY ordinal_position;
```
Expected: ~10 rows matching the columns above.

**Step 4: Commit**

```bash
git add supabase/migrations/018_invites.sql
git commit -m "feat(db): migration 018 — invites table"
```

---

### Task 3.2: Server actions for invite create + accept

**Files:**
- Create: `apps/admin/src/app/invite/[token]/actions.ts`
- Modify: `apps/admin/src/app/(dashboard)/employees/actions.ts` — add `createInvite`

**Step 1: Add `createInvite` to employees/actions.ts**

```ts
'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function createInvite(input: {
  email?: string;
  store_id?: string;
  company_role?: string;
}): Promise<{ token: string } | { error: string }> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // (Optional) verify the calling user is an admin via a session check.
  // For v1 we rely on the page being inside (dashboard) which is auth-only.

  const payload: Record<string, unknown> = {};
  if (input.email?.trim()) payload.email = input.email.trim();
  if (input.store_id) payload.store_id = input.store_id;
  if (input.company_role) payload.company_role = input.company_role;

  const { data, error } = await admin
    .from('invites')
    .insert(payload)
    .select('token')
    .single();

  if (error || !data) return { error: error?.message ?? 'Не удалось создать инвайт.' };
  return { token: data.token };
}
```

**Step 2: Add `acceptInvite` action**

```ts
'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';

type AcceptResult = { ok: true } | { ok: false; error: string };

export async function acceptInvite(formData: FormData): Promise<AcceptResult> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const emailField = String(formData.get('email') ?? '').trim();
  const storeField = String(formData.get('store_id') ?? '');
  const roleField = String(formData.get('company_role') ?? '');

  if (!token || !password || !fullName || !emailField) {
    return { ok: false, error: 'Заполните все поля.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Пароль должен быть не короче 6 символов.' };
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Re-validate the invite server-side
  const { data: invite } = await admin
    .from('invites')
    .select('id, email, store_id, company_role, used_at, expires_at')
    .eq('token', token)
    .single();

  if (!invite) return { ok: false, error: 'Инвайт не найден.' };
  if (invite.used_at) return { ok: false, error: 'Инвайт уже использован.' };
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'Срок действия инвайта истёк.' };
  }

  // If the invite pre-set a value, force it (don't trust client override)
  const finalEmail = invite.email ?? emailField;
  const finalStore = invite.store_id ?? (storeField || null);
  const finalRole = invite.company_role ?? (roleField || null);

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: finalEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (cErr || !created.user) {
    return { ok: false, error: cErr?.message ?? 'Не удалось создать аккаунт.' };
  }

  const { error: insErr } = await admin.from('users').insert({
    id: created.user.id,
    email: finalEmail,
    full_name: fullName,
    role: 'employee',
    company_role: finalRole,
    store_id: finalStore,
    is_active: true,
  });
  if (insErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Ошибка профиля: ${insErr.message}` };
  }

  await admin
    .from('invites')
    .update({ used_at: new Date().toISOString(), used_by_user_id: created.user.id })
    .eq('id', invite.id);

  return { ok: true };
}
```

**Step 3: Typecheck**

```
cd apps/admin && npx tsc --noEmit
```
Expected: clean.

**Step 4: Commit**

```bash
git add "apps/admin/src/app/(dashboard)/employees/actions.ts" "apps/admin/src/app/invite/"
git commit -m "feat(admin): createInvite + acceptInvite server actions"
```

---

### Task 3.3: Admin UI — "Пригласить" button + modal

**Files:**
- Modify: `apps/admin/src/app/(dashboard)/employees/employees-client.tsx` (read first to find a clean place for the button)

**Step 1: Read the existing file**

```
Read apps/admin/src/app/(dashboard)/employees/employees-client.tsx
```

**Step 2: Add a state + modal**

Add a button next to the existing "Добавить" action (or in the toolbar):

```tsx
<Button variant="outline" onClick={() => setInviteOpen(true)}>
  Пригласить
</Button>
```

Add the Dialog (modal) with three optional fields (email, store, company_role) and a "Создать ссылку" button that calls `createInvite`. On success, render the resulting URL with a Copy button:

```tsx
{inviteLink ? (
  <div className="space-y-2">
    <p className="text-sm">Ссылка для отправки сотруднику:</p>
    <div className="flex gap-2">
      <input readOnly value={inviteLink} className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-xs font-mono" />
      <Button onClick={() => navigator.clipboard.writeText(inviteLink)}>Скопировать</Button>
    </div>
    <p className="text-xs text-muted-foreground">Ссылка действительна 7 дней.</p>
  </div>
) : (
  /* form */
)}
```

`inviteLink = `${window.location.origin}/invite/${token}`` after the server action returns success.

**Step 3: Typecheck + lint**

```
cd apps/admin && npx tsc --noEmit && npx eslint .
```
Expected: clean.

**Step 4: Commit**

```bash
git add "apps/admin/src/app/(dashboard)/employees/employees-client.tsx"
git commit -m "feat(admin): invite modal on /employees"
```

---

### Task 3.4: Public `/invite/[token]` page

**Files:**
- Create: `apps/admin/src/app/invite/[token]/page.tsx`
- Create: `apps/admin/src/app/invite/[token]/invite-form.tsx`

**Step 1: Server component validates token**

```tsx
import { notFound } from 'next/navigation';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { InviteForm } from './invite-form';

export const dynamic = 'force-dynamic';

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
    .select('email, store_id, company_role, used_at, expires_at, store:stores(name)')
    .eq('token', token)
    .single();

  if (!invite) notFound();
  if (invite.used_at) {
    return <InvalidPage reason="Эта ссылка уже использована." />;
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return <InvalidPage reason="Срок действия ссылки истёк. Попросите менеджера прислать новую." />;
  }

  // Look up role label and store name for display
  const { data: stores } = await admin.from('stores').select('id, name').order('name');
  const COMPANY_ROLE_LABELS: Record<string, string> = {
    baker: 'Пекарь',
    manager: 'Управляющий',
    tech_specialist: 'Тех. специалист',
    admin: 'Администратор',
    owner: 'Владелец',
  };

  return (
    <InviteForm
      token={token}
      preEmail={invite.email ?? ''}
      preStoreId={invite.store_id ?? ''}
      preRole={invite.company_role ?? ''}
      stores={stores ?? []}
      roleLabels={COMPANY_ROLE_LABELS}
    />
  );
}

function InvalidPage({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
        <h1 className="text-lg font-bold mb-2">Ссылка недействительна</h1>
        <p className="text-sm text-muted-foreground">{reason}</p>
      </div>
    </div>
  );
}
```

**Step 2: Client form**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvite } from '../../invite/[token]/actions';

type Store = { id: string; name: string };

export function InviteForm({
  token,
  preEmail,
  preStoreId,
  preRole,
  stores,
  roleLabels,
}: {
  token: string;
  preEmail: string;
  preStoreId: string;
  preRole: string;
  stores: Store[];
  roleLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set('token', token);
    const r = await acceptInvite(fd);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace('/login?invited=1'), 1500);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
          <h1 className="text-lg font-bold mb-2">Аккаунт создан</h1>
          <p className="text-sm text-muted-foreground">Перенаправляем на страницу входа…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-sm">
        <h1 className="text-lg font-bold mb-1">Регистрация сотрудника</h1>
        <p className="text-xs text-muted-foreground mb-5">
          Заполните данные — они привязаны к вашему приглашению.
        </p>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="ФИО" name="full_name" type="text" />
          <Field label="Email" name="email" type="email" defaultValue={preEmail} readOnly={!!preEmail} />
          <Field label="Пароль" name="password" type="password" minLength={6} />

          {/* Store — readonly if pre-set */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Магазин</label>
            {preStoreId ? (
              <>
                <input
                  type="text"
                  value={stores.find((s) => s.id === preStoreId)?.name ?? ''}
                  readOnly
                  className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm"
                />
                <input type="hidden" name="store_id" value={preStoreId} />
              </>
            ) : (
              <select name="store_id" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm">
                <option value="">— Не выбран —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Role — readonly if pre-set */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Роль</label>
            {preRole ? (
              <>
                <input
                  type="text"
                  value={roleLabels[preRole] ?? preRole}
                  readOnly
                  className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm"
                />
                <input type="hidden" name="company_role" value={preRole} />
              </>
            ) : (
              <select name="company_role" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm">
                <option value="">— Не указана —</option>
                {Object.entries(roleLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
          >
            {loading ? 'Создание…' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, name, type, minLength, defaultValue, readOnly,
}: {
  label: string; name: string; type: string;
  minLength?: number; defaultValue?: string; readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        name={name}
        type={type}
        minLength={minLength}
        defaultValue={defaultValue}
        readOnly={readOnly}
        required
        className={`w-full px-3 py-2 rounded-xl border border-border text-sm ${
          readOnly ? 'bg-muted' : 'bg-background'
        }`}
      />
    </div>
  );
}
```

**Step 3: Typecheck + lint**

```
cd apps/admin && npx tsc --noEmit && npx eslint .
```
Expected: clean.

**Step 4: Commit**

```bash
git add "apps/admin/src/app/invite/"
git commit -m "feat(admin): /invite/[token] acceptance page"
```

---

### Task 3.5: Verify Phase 3 end-to-end on prod

**Step 1: Push + deploy**

```bash
git push origin main
cd /Users/vasilijaistov/Desktop/continuum/tandyr && npx vercel@latest --prod --yes
```

**Step 2: Smoke**

- Log in as admin → `/employees` → "Пригласить" → fill (email pre-set test, store=any, role=baker) → submit → copy link.
- Open link in a new (incognito) Playwright context → verify form pre-filled and store/role are read-only.
- Submit with password → expect redirect to `/login?invited=1`. Log in → expect mobile-app-style identity.
- Check via SQL:
  ```sql
  SELECT u.email, u.role, u.company_role, u.store_id, i.used_at, i.used_by_user_id
  FROM users u
  JOIN invites i ON i.used_by_user_id = u.id
  ORDER BY u.created_at DESC LIMIT 1;
  ```
  Expected: one row, correct fields, `used_at IS NOT NULL`.
- Hit the same link a second time → expect "уже использована" page.

**Step 3: Cleanup test artifacts**

```sql
DELETE FROM public.users WHERE email = '<test-email>';
-- and delete the auth.users row via auth.admin.deleteUser if needed
```

**Step 4: Phase 3 done. Plan complete.**

---

## Risks & rollback

- **Open signup left enabled**: hostile actor could create unlimited admin accounts. Mitigation: the toggle defaults to `'true'` for launch; flip it to `'false'` from Settings as soon as the team is set. The page returns 404 when disabled.
- **Recovery email landing in spam**: Supabase default email reputation is mediocre. If it's a problem, switch to a custom SMTP later — no code change required, just dashboard config.
- **Invite token guessing**: tokens are UUIDv4 (122 bits of entropy). Brute-force is not a concern.
- **Migrations**: 017 is an INSERT (safe). 018 is a CREATE TABLE (safe; no dependencies on existing data). To roll back: `DROP TABLE public.invites` and `DELETE FROM settings WHERE key='open_signup_enabled'`.

## Done means

- `/forgot-password` and `/reset-password` work end-to-end on prod (smoke verified).
- `/signup` works when toggle is `'true'`, returns 404 when `'false'`.
- Settings UI has the toggle, flipping it produces the expected behaviour.
- `/employees` has an invite modal that generates URLs.
- `/invite/[token]` accepts a valid invite, creates the user, marks it used, blocks reuse.
- `npx tsc --noEmit` and `npx eslint .` both clean for `apps/admin/`.
- All three phases deployed to `https://tandyr.vercel.app`.
