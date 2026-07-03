# PWA refactor — performance & cross-platform design

Date: 2026-07-03
Status: approved (user: "делаем именно PWA, Expo не в приоритете")
Foundation: knowledge graph at `graphify-out/` (557 nodes, 711 edges, 84 communities)

## Goals (user-stated)

1. **Maximum platform speed** — both employee client and admin panel.
2. **Cross-platform compatibility** — any device, **Android smartphones and their browsers are the priority target**.
3. **Simplest employee flow**: log in → arrive → open shift → send photo → work → send second photo → close shift → data fully lands in admin panel → shift closed, employee access retained.
4. Admin panel loads and works fast.

## Strategic decision

**Web-first PWA.** The employee client becomes the `(employee)` route group of the existing Next.js admin app, upgraded to full functional parity with the Expo app and packaged as an installable PWA. One codebase serves every Android browser (Chrome, Samsung Internet, Yandex, Mi Browser, Opera), iOS Safari, and desktop.

**Expo app: frozen.** Not deleted, not developed. If the PWA proves itself with real bakers, the Expo app can be retired later. No work is scheduled on `apps/mobile` in this refactor beyond leaving it untouched.

## Graph-derived diagnosis

| # | Finding (graph/recon evidence) | Impact |
|---|---|---|
| D1 | Employee web `startShift` writes nonexistent column `started_at`, omits NOT NULL `start_photo_url`/`start_lat`/`start_lng` → **web shift flow is broken at the DB level** | Blocks goal 3 entirely on web |
| D2 | Employee web flow has no camera, no geolocation, no photo upload (mobile-only features) | Blocks goal 2/3 |
| D3 | 17 admin pages are `force-dynamic` — every visit is a full SSR round-trip with all queries | Goal 4 |
| D4 | Camera photos upload uncompressed (~3–8 MB on budget Android) | Goal 1/3 — slow, fragile on weak store Wi-Fi/LTE |
| D5 | `apps/mobile/lib/shared/*` is a drifting local copy of `packages/shared/src/*` (graph: semantically_similar_to, 0.9) | Maintenance drag; mobile frozen ⇒ fix by convention only |
| D6 | No PWA manifest, no service worker, no icons, no offline shell | Goal 2 — installability on Android |
| D7 | `overview/page.tsx` fires 8 queries per visit (already Promise.all — good), but no caching between visits | Goal 4 |
| D8 | Employee web page runs 4 sequential awaits before first paint | Goal 1 |

## Architecture

### Employee PWA (route group `(employee)` in apps/admin)

**Flow parity with mobile, adapted to web APIs:**

| Mobile (Expo) | Web PWA equivalent |
|---|---|
| `ImagePicker.launchCameraAsync` (camera-only) | `<input type="file" accept="image/*" capture="environment">` — camera-only on Android/iOS mobile browsers |
| `Location.getCurrentPositionAsync(High)` | `navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true })` |
| Photo → fetch(uri) → blob → upload | File → **canvas resize to ≤1600px, JPEG q0.7 (~150–350 KB)** → upload. Client-side compression is the single biggest flow-speed win (D4) |
| `findNearestStore` (haversine client-side) | same — `@tandyr/shared` `findNearestStore` |
| Zustand stores | React state + server as source of truth (shift state is one row; no client store needed on web) |

**Screens (mobile-first, thumb-reach layout, Russian):**
1. `/employee` — hub: active shift card or "Начать смену" CTA; actions grid (прогресс, техзаявка, зарплата, чаты→ссылка); pull-based refresh
2. `/employee/start-shift` — photo capture → geo → nearest store confirmation → submit
3. `/employee/end-shift` — photo capture → production kg → geo → submit
4. `/employee/progress` — intermediate kg report
5. `/employee/tech-request` — breakage report (+ optional photo)
6. `/employee/salary` — weekly salary view (mirror of mobile salary screen)
7. `/employee/profile` — name/phone/avatar + logout

Server actions rewritten against the **real schema** (`start_time`, `start_photo_url`, `start_lat/lng`, `end_*`, `production_kg`, `status`). Photo upload goes directly from browser to Supabase Storage with the anon-key client (same path as mobile: `shifts/{userId}/{ts}_start.jpg` — existing RLS policies already allow this), so the Next.js server never proxies image bytes.

**Reliability on weak networks:**
- Upload with 2 retries + exponential backoff
- The shift-open mutation is idempotent-guarded (existing "already have open shift" check)
- If photo uploaded but insert failed → orphaned storage object is acceptable (same tradeoff as mobile)

### PWA packaging

- `manifest.webmanifest` (name Tandyr, standalone display, theme #E8564A, icons 192/512 + maskable)
- Service worker via **Serwist** (maintained successor of next-pwa): precache app shell, runtime cache for static assets; **network-first for data** (no stale shift state); offline fallback page "Нет соединения"
- `apple-touch-icon` + iOS meta for Safari installability
- Installation hint banner on `/employee` for Android (beforeinstallprompt)

### Admin panel speed

1. **Remove `force-dynamic` where cookies already imply dynamic** — Next.js auto-detects; explicit flag disables even partial caching. Audit all 17.
2. **Per-request deduplication + parallelism** — pages already use Promise.all in places; extend to the sequential offenders (D8).
3. **`next/dynamic` for heavyweight client components**: chart in overview, XLSX already lazy, Leaflet already lazy — verify and extend to dialogs with heavy trees.
4. **Slim selects** — replace remaining `select('*')` with column lists on hot paths (overview, employee page).
5. **`revalidate` for semi-static reference data** (stores list on public invite page etc.) where auth allows.
6. Bundle audit via `next build` output — no new deps.

### Shared package

- Employee PWA consumes `@tandyr/shared` only (no new copies).
- Mobile keeps its frozen local copy (per freeze decision) — a comment is added at the top of `apps/mobile/lib/shared/*` marking it frozen/deprecated.

## Non-goals

- No Expo/React Native work (frozen)
- No offline-first data sync (network-first; bakery has connectivity; offline queue is a later iteration if field data demands it)
- No push notifications for PWA in this phase (edge functions continue to serve Expo push for the frozen app; web push is a follow-up)
- No design-system rewrite — existing Tailwind/shadcn visual language stays

## Phases

1. **Phase A — Employee web flow rebuild** (fix D1/D2/D4): real server actions, camera/geo/compression, all 7 screens
2. **Phase B — PWA packaging** (fix D6): manifest, Serwist SW, icons, install prompt, offline fallback
3. **Phase C — Admin speed pass** (fix D3/D7/D8): force-dynamic audit, query slimming, dynamic imports
4. **Phase D — Cross-device verification**: Playwright mobile-viewport E2E of the full shift flow on prod + Lighthouse-style checks

Each phase ships independently; commits per task; two-stage review per phase (spec + quality) as established.

## Success criteria

- Employee on any Android browser can complete the full shift cycle (login → open+photo → progress → close+photo) with all data visible in admin
- Photo payload ≤400 KB per shot on any device
- `/employee` TTI on a mid-range Android over 4G: subjectively instant (<3s cold)
- Admin overview loads without regression in data completeness
- PWA installable from Chrome Android (manifest + SW valid)
- Expo app untouched and still builds
