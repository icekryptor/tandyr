# PWA Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (already chosen by user in prior feature). Two-stage review per phase.

**Goal:** Employee shift flow works end-to-end in any Android browser as an installable PWA; admin panel gets a speed pass. Expo untouched.

**Architecture:** All work inside `apps/admin` (Next.js 16) + `packages/shared`. Phase A rebuilds the `(employee)` route group with real camera/geo/compression against the actual DB schema. Phase B adds manifest + Serwist service worker. Phase C is an admin-wide performance audit. Phase D verifies on prod with mobile viewport.

**Tech stack:** Next.js 16 App Router, `@supabase/ssr` + anon browser client for direct storage upload, canvas-based client image compression (no new deps), Serwist for SW (one new dev dep), Tailwind/shadcn.

**Verification discipline:** `npx tsc --noEmit`, `npx eslint .` (baseline 0 errors / 4 `<img>` warnings — employee photo previews may add justified ones), `npx next build` clean, Playwright-MCP smoke on prod with 390×844 viewport, SQL verification via Supabase MCP.

**Design reference:** [`2026-07-03-pwa-refactor-design.md`](./2026-07-03-pwa-refactor-design.md)

---

## Phase A — Employee web flow rebuild

### Task A1: Client-side image compression utility

**Files:**
- Create: `apps/admin/src/lib/compress-image.ts`

Pure browser util: `compressImage(file: File, { maxDim = 1600, quality = 0.7 }): Promise<Blob>` via `createImageBitmap` → canvas → `toBlob('image/jpeg')`. Fallback: if `createImageBitmap` unavailable (old WebView), use `<img>` + object URL path. Returns original file if already smaller than ~300 KB and within dimensions. Handle EXIF orientation implicitly (createImageBitmap with `imageOrientation: 'from-image'`).

Verify: tsc + eslint. Commit: `feat(admin): client-side image compression util for employee PWA`.

### Task A2: Rewrite employee server actions against real schema

**Files:**
- Rewrite: `apps/admin/src/app/(employee)/employee/actions.ts`

Actions (all validate session via `supabase.auth.getUser()`):
- `startShift(input: { storeId, photoUrl, lat, lng })` — insert with `start_photo_url`, `start_lat`, `start_lng`, `start_time: now`, `status: 'open'`; guard on existing open shift; return shift row with store join
- `endShift(input: { shiftId, photoUrl, lat, lng, productionKg })` — update `end_photo_url`, `end_lat`, `end_lng`, `end_time`, `production_kg`, `status: 'closed'`; guard: shift belongs to user AND is open
- `submitProgress(shiftId, kg)` — keep, verify columns (`progress_reports`: `shift_id`, `production_kg`, `reported_at`; check whether `user_id` exists in schema — read migration 001 first)
- `submitTechRequest(formData)` — keep, verify against `tech_requests` schema (has `description`, `photo_url`, no `title` in 001 — read migrations 001+013 first)

Photo upload happens client-side (browser → Supabase Storage direct, anon key + RLS `shifts/{uid}/...` path); actions receive the public URL. Commit: `fix(admin): employee shift actions target real schema`.

### Task A3: Camera/geo capture component + start-shift & end-shift pages

**Files:**
- Create: `apps/admin/src/components/photo-capture.tsx` — `<input type="file" accept="image/*" capture="environment">` styled as the dashed photo card (matches mobile UX); preview via object URL; "Переснять" re-opens picker; calls `compressImage` on selection
- Create: `apps/admin/src/lib/geolocation.ts` — promisified `getCurrentPosition` with `enableHighAccuracy: true`, 15s timeout, Russian error messages per error code (denied / unavailable / timeout)
- Create: `apps/admin/src/app/(employee)/employee/start-shift/page.tsx` (+ client component) — flow mirrors mobile: photo → geo → fetch stores (id, name, address, lat, lng only) → `findNearestStore` from `@tandyr/shared` → show detected store → upload compressed photo to `shift-photos` bucket → `startShift` action → redirect to `/employee`
- Create: `apps/admin/src/app/(employee)/employee/end-shift/page.tsx` (+ client component) — photo → kg input (decimal-pad) → geo → upload → `endShift` → redirect

Upload uses browser Supabase client (`@/lib/supabase/client`) with 2 retries + backoff. Commit per page.

### Task A4: Hub page rebuild + secondary screens

**Files:**
- Rewrite: `apps/admin/src/app/(employee)/employee/page.tsx` + `employee-home.tsx` — server component fetches profile/open-shift/recent-shifts in `Promise.all` (fix sequential awaits); hub shows active-shift card (store, start time, "Завершить смену" CTA) or "Начать смену" CTA; actions grid: Прогресс, Техзаявка, Зарплата, Профиль
- Create: `apps/admin/src/app/(employee)/employee/progress/page.tsx` — kg form → `submitProgress`
- Create: `apps/admin/src/app/(employee)/employee/tech-request/page.tsx` — description + optional photo → upload to `tech-request-photos` → `submitTechRequest`
- Create: `apps/admin/src/app/(employee)/employee/salary/page.tsx` — server component reads own `weekly_salaries` (RLS), renders latest hero + history (mirror mobile salary screen layout in web Tailwind)
- Create: `apps/admin/src/app/(employee)/employee/profile/page.tsx` — name/email/store display, phone edit, avatar upload (reuse compress util), logout

Navigation: simple back-links, no client router state. Mobile-first: max-w-md center column, 44px+ touch targets, `text-base` inputs (prevents iOS zoom). Commits per screen group.

### Task A5: Phase A review + prod verify

Two-stage review (spec vs design doc §Employee PWA; then code quality focused on: schema correctness, upload retry logic, compression edge cases, race on double-submit). Fix findings. Push + deploy. Playwright mobile viewport (390×844): full cycle login → start shift (mock photo via file input, geolocation via CDP override) → progress → end shift → verify rows in DB via SQL (start/end photo URLs non-null, coords set, status closed). Verify admin sees the shift in /shifts.

---

## Phase B — PWA packaging

### Task B1: Manifest + icons + meta

**Files:**
- Create: `apps/admin/src/app/manifest.ts` (Next.js MetadataRoute.Manifest): name "Tandyr", short_name "Tandyr", start_url `/employee`, display `standalone`, theme_color `#E8564A`, background `#F9FAFB`, icons 192/512 + maskable
- Create: icons in `apps/admin/public/` (generate simple "Т" brand mark on #E8564A rounded square via script — canvas/sharp not needed: write SVG → convert if possible, else commit pre-made PNGs)
- Modify: `apps/admin/src/app/layout.tsx` — viewport meta (already Next default), `apple-touch-icon`, `theme-color`

### Task B2: Service worker via Serwist

**Files:**
- Add dev deps: `@serwist/next`, `serwist`
- Create: `apps/admin/src/sw.ts` — precache app shell, runtime `NetworkFirst` for navigations, `StaleWhileRevalidate` for static assets, **never cache** `/api/`, Supabase URLs, or server actions
- Modify: `apps/admin/next.config.ts` — wrap with `withSerwist`
- Create: offline fallback page `apps/admin/src/app/offline/page.tsx` ("Нет соединения — проверьте интернет")

Check Serwist + Next 16 + Turbopack compatibility first; if Turbopack production build conflicts, scope SW injection to production webpack build or use manual SW registration with a hand-rolled minimal SW (cache-shell only) — decide in-task, document choice.

### Task B3: Install prompt + Phase B review/verify

- `beforeinstallprompt` capture + dismissible "Установить приложение" banner on `/employee` (localStorage-remembered dismissal)
- Review both tasks, fix, deploy, verify: manifest reachable, SW registers on prod (Playwright: check `navigator.serviceWorker.ready`), Lighthouse PWA-installability via Chrome DevTools MCP if available, offline fallback renders when network blocked.

---

## Phase C — Admin speed pass

### Task C1: force-dynamic audit

Audit all 17 `export const dynamic = 'force-dynamic'` sites. Keep only where the page reads cookies/auth AND Next would otherwise statically cache (server components using `createClient()` from `@supabase/ssr` already opt into dynamic via cookies — the explicit flag is then redundant but harmless; REMOVE where redundant to allow future partial prerendering, KEEP on unauthenticated data-dependent pages: `/signup`, `/invite/[token]`). Measure `next build` route table before/after.

### Task C2: query slimming + parallelism

- `(employee)/employee/page.tsx` — done in A4 (Promise.all)
- `overview/page.tsx` — replace `select('*', head: true)` counts (fine) but slim `recentShifts` select to needed columns; keep Promise.all
- `chats/[id]/page.tsx` and remaining `select('*')` hot paths → column lists
- `stores/page.tsx` fallback select — column list

### Task C3: bundle triage

`next build` output analysis: list top-5 heaviest first-load routes; apply `next/dynamic` where a heavy client component is below-the-fold or dialog-gated (candidates from graph: yandex-map-picker already lazy; check salary WeekStrip/XLSX path, chat media). No new deps. Document before/after numbers in commit message.

### Task C4: Phase C review + verify

Review, fix, deploy, smoke admin pages via Playwright (overview, employees, shifts, salary render with data), compare route-table sizes.

---

## Phase D — Cross-device verification (final)

- Full employee cycle on prod at 390×844 (Android-like) AND 360×740 (small Android) viewports
- Throttled-network sanity: photo upload completes with compression (verify object size in storage < 400 KB via SQL/storage API)
- Admin regression pass: overview/employees/shifts/salary/settings load
- Final holistic code review across all phases
- Update design doc with as-shipped notes; graphify `--update` to refresh the graph with new code

## Rollback

Each phase is a set of small commits on main, deployable independently; revert by `git revert` range. DB is untouched (no migrations in this refactor) except none planned. Expo app untouched.

## Done means

- Employee full cycle works in Android browser on prod (verified via Playwright mobile viewport + DB rows)
- PWA installable (manifest + SW active on prod)
- Photo uploads ≤400 KB
- Admin pages: no force-dynamic where removable, slimmed hot queries, documented bundle numbers
- tsc/eslint/build clean; Expo untouched
