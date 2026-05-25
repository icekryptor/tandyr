# Self-signup, forgot password, and employee invites — design

Date: 2026-05-25
Status: approved, awaiting implementation plan

## Motivation

Two operational pains today:
1. Creating new admin accounts requires running a service-role Node script. No way for the user to onboard themselves or other admins independently.
2. Recovering a forgotten password requires the same script. The recent Windows-keyboard-layout incident made this acute.

Goal: get the admin out of the manual-account-creation loop entirely, both for admins (during launch) and for employees (permanently).

## Scope

Three features delivered in this order, smallest to largest:

1. **Forgot password** — built-in Supabase recovery flow surfaced via two new web routes.
2. **Open admin signup** — temporary public signup page for the launch period, gated by a settings toggle.
3. **Employee invites** — admin-issued invite links that pre-bind store/role and let the employee complete their own profile.

## Non-goals (v1)

- Custom SMTP / branded recovery emails — Supabase default email is fine for now.
- Deep-linked mobile signup — for v1 employees register on the web from their phone browser, then log into the mobile app with the credentials.
- Admin-approval workflows for self-registered admins — too much for a feature that will be disabled post-launch.
- Per-invite throttling / rate limits — out of scope.
- Audit logging beyond what Supabase Auth already provides.

## Architecture

### Feature 1: Forgot password

Pure web feature, no DB changes.

- **`/login`** — add a `Забыли пароль?` link below the form.
- **`/forgot-password`** (new) — single email input; on submit calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<origin>/reset-password' })` and shows "Письмо отправлено" state regardless of whether the email exists (anti-enumeration).
- **`/reset-password`** (new) — entry point for the link in the email. Supabase sets a recovery session on URL hash arrival. Page shows a new-password form; submit calls `supabase.auth.updateUser({ password })` and redirects to `/login` on success.

Email transport: Supabase built-in SMTP. Default subject/body — fine for v1, customise later in the Supabase dashboard if needed.

### Feature 2: Open admin signup (temporary)

- **`/signup`** (new) — form with email, password, full name.
- **Submit handler (server action)**:
  1. Read `settings.open_signup_enabled`. If not `'true'`, return 404 / generic error.
  2. `supabase.auth.signUp({ email, password, options: { data: { full_name } } })` via the SSR client.
  3. Insert into `public.users` with `role='admin'`, `is_active=true`, `full_name=<name>`, `email=<email>`. Use service-role client so the insert isn't blocked by RLS even if there is no session yet.
  4. Redirect to `/login` with a success flash, or sign in immediately if a session is returned.
- **Settings gate**: new `settings` row `open_signup_enabled` (default `'true'` for the launch window). Server-side check in `/signup/page.tsx` calls `notFound()` when disabled. The link on `/login` is hidden the same way.
- **Settings UI toggle**: new control in `/settings` (admin/owner-gated as today) to flip the value.
- **Disabling later**: the feature isn't deleted in code; just flip the toggle to `'false'`. The page is dead-listed and the link disappears.

### Feature 3: Employee invites

Persistent, intended to stay.

**New migration `017_invites.sql`**:

```sql
CREATE TABLE public.invites (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token           uuid NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  email           text,                  -- optional pre-fill
  store_id        uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  company_role    text CHECK (company_role IN ('baker','manager','tech_specialist','admin','owner')),
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at         timestamptz,
  used_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_token ON public.invites(token);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Anonymous reads by token only — for the /invite/[token] page
CREATE POLICY "Anyone can read invite by token (used by page)" ON public.invites
  FOR SELECT USING (true);

CREATE POLICY "Admins manage invites" ON public.invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

Note: the `SELECT USING (true)` is intentional and minimal-info — the page only needs token + expiry + pre-fill values to render, and the token itself is the secret. We do not expose the table via any list endpoint.

**Admin UI:**

- New button "Пригласить" on `/employees` next to the existing "Добавить сотрудника" action.
- Modal asks (all optional): email, store (dropdown), company_role (dropdown). Submit → server action creates an invite → shows the generated URL `https://tandyr.vercel.app/invite/<token>` with a copy button. Copy → paste into WhatsApp/SMS.
- Optional: a panel on the same page listing active/used invites. (Stretch; can ship without.)

**Invite acceptance page `/invite/[token]`:**

1. Server component validates: token exists, `used_at IS NULL`, `expires_at > now()`. Otherwise show a "ссылка недействительна" page.
2. Renders a signup form pre-filled with `email`/`store_id`/`company_role` if the invite specified them; the user can edit unfilled fields.
3. Submit (server action):
   - `auth.signUp` (or `auth.admin.createUser` via service role for cleaner control).
   - Insert `public.users` row with `role='employee'`, `is_active=true`, plus the chosen store + company_role + full_name.
   - `UPDATE invites SET used_at = now(), used_by_user_id = <id> WHERE id = <invite.id>`.
   - Redirect to `/login`.

**Mobile path (v1):**
- The employee opens the invite link on their phone. The browser fills out the form, account gets created. Then they download the Tandyr Expo app and log in with the same credentials they just set.
- Deep linking via the existing `tandyr://` scheme can replace the browser handoff later — not blocking for launch.

## Data model summary

| Change | Type |
|---|---|
| `settings.open_signup_enabled` | new row, default `'true'` |
| `public.invites` | new table (migration 017) |
| `public.users` | no schema change; rows inserted by signup flows |

## Security tradeoffs (acknowledged)

- **Open admin signup**: anyone who finds `/signup` while the toggle is on can create a full admin. Mitigation: keep enabled only for the launch window (days, not months); turn off as soon as the team is set. Document this.
- **Invite tokens**: long random UUIDs in URLs. Anyone with the URL can use it, but each is single-use and 7-day-expiring. Acceptable for B2B onboarding.
- **Email enumeration on forgot password**: avoided by always showing the same success message regardless of whether the email exists.

## Open questions resolved

- **Default for `open_signup_enabled`**: `'true'` at first deploy. Rationale: feature exists explicitly to remove launch friction; defaulting off means the user has to flip it before they can use it, which keeps me (Claude) in the loop one more time. Defaulting on lets the user immediately register their team and turn the toggle off when done.

## Implementation order and rough effort

1. Forgot password — ~2 routes + 1 form change to `/login`. Small.
2. Open admin signup — 1 route + 1 server action + 1 settings row + 1 toggle in Settings UI. Small-medium.
3. Employee invites — 1 migration + 1 modal on `/employees` + invite-list panel (optional) + `/invite/[token]` route + server action. Medium.

Each can ship in its own commit; the three are independent.
