# Nilric Smart Attendance

Location-based worker attendance **PWA** with **Google SSO**, deployed on **Vercel**, stored in **Postgres** (Neon via Vercel Marketplace).

Workers sign in with Google (prevents credential sharing). Location access is **mandatory** for check-in and check-out. The app welcomes workers to the office on check-in and wishes them a safe journey on check-out.

## Features

- **SSO-gated app** — `/`, `/check-in`, `/time-off` and `/admin/*` all require Google sign-in before any content renders
- **Google SSO** for workers and admins (Auth.js / NextAuth)
- **Post-login app launcher** — after sign-in everyone lands on an app grid showing only the modules their role can open
- **Admin access control** via `ADMIN_EMAILS` allowlist
- **Mandatory GPS** before check-in/out (app blocks if location is denied)
- Dual-layer verification: GPS geofence + office Wi-Fi IP backup
- Location-aware **welcome / goodbye** messages using `OFFICE_NAME` + `OFFICE_CITY`
- **Multi-site project locations** — admin registers remote sites on a Google map; workers pick any active site (or HQ default) at check-in
- Installable PWA (static service worker) with install prompt
- Admin dashboard: workers, sites, reports, CSV export

## V1 platform modules (Odoo-inspired)

The app now has an Odoo-inspired module platform plus two modules:

- **Employees** — employee directory with department, job title, manager and
  platform role. Managed at `/admin/employees` (search, create, edit, archive).
- **Attendances** — Odoo-style attendance records at
  `/admin/attendance` with `open / closed / corrected` state.
  HR, the Managing Director and Admins can correct records
  (state, check-in/out times, correction notes) from the record detail page.
- **Time Off** — leave requests at `/admin/time-off` with an approval
  workflow (`to_approve / validated / refused / draft`). Workers request
  time off from their own portal (`/api/my/leaves`); HR, Managing Director
  and Admins approve or refuse. Migration: `db/migrations/0006_timeoff_recruitment.sql`.
- **Recruitment** — applicant pipeline at `/admin/recruitment` with an
  Odoo-style kanban board (`new → screening → 1st/2nd interview → contract →
  hired`, plus `refused`) and job positions. HR and Admins manage it.
  Migration: same `0006_timeoff_recruitment.sql`.

### Roles

| Role | Source of truth | Access |
|------|-----------------|--------|
| Administrator | `ADMIN_EMAILS` env | Everything, incl. workers/sites settings |
| HR Officer | `employees.role = 'hr'` | Manage employees, view + correct attendance |
| Managing Director | `employees.role = 'director'` | View all, correct attendance |
| Accountant | `employees.role = 'accountant'` | View employees + attendance + leaves |
| Marketing | `employees.role = 'marketing'` | View employees, leaves, applicants |
| Worker | default Google sign-in | Check-in/out self-service |

Set an employee's role on their record at `/admin/employees/[id]`. Role is
resolved from the employee record at sign-in, with `ADMIN_EMAILS` always
winning as full administrator. The migration is `db/migrations/0005_v1_platform.sql`
(apply with `npm run db:migrate`). Time Off and Recruitment tables come
from `db/migrations/0006_timeoff_recruitment.sql`. The admin shell is an
Odoo-style web client (app bar + app switcher + module sidebar), and signed-in
workers get a self-service portal with GPS check-in and "My Time Off".

## Stack

| Piece | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth v5 (`next-auth`) + Google |
| Database | Postgres via **Vercel Marketplace → Neon** (`postgres` / Postgres.js) |
| Admin maps | **Google Maps JavaScript API + Places + Geocoding** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) |
| PWA | Static service worker (`public/sw.js`) — no Serwist build step |
| Hosting | **Vercel** |

> **Note:** Legacy “Vercel Postgres” / Netlify Database are retired. New projects use **Neon Postgres** installed from the Vercel Marketplace. The app reads `POSTGRES_URL` (also accepts `DATABASE_URL`).

## UI design system

One violet palette (from the logo) plus neutral tokens, defined in
`app/globals.css`:

| Token | Used for |
|-------|----------|
| `brand-50…950` | Primary actions, app bars, focus, active nav |
| `surface` / `surface-muted` / `surface-sunken` | Cards, page background, table heads |
| `line` / `line-strong` | Hairline borders and control borders |
| `ink` / `ink-muted` / `ink-faint` | Text hierarchy |

Shared classes: `.card`, `.panel`, `.btn-primary`, `.btn-secondary`,
`.btn-quiet`, `.input`, `.eyebrow`, `.tnum`. Shared components: `PageBar`
(worker page bar) and `ModuleHeader` (admin module header). The old Odoo
plum (`#714B67`) and the unused `AdminNav` component were removed so the
whole product uses one palette.

## Google OAuth setup

### 1. Project + OAuth consent screen
1. [Google Cloud Console](https://console.cloud.google.com/) → create/select project
2. **APIs & Services → OAuth consent screen**
3. User type: **External**
4. App name: `Nilric Smart Attendance` + support/dev emails
5. Scopes: `openid`, `email`, `profile`
6. If status is **Testing**, add every worker/admin Google email under **Test users**

### 2. Create OAuth client
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. **Authorized JavaScript origins**

   | Environment | Origin |
   |-------------|--------|
   | Vercel production | `https://YOUR-PROJECT.vercel.app` |
   | Vercel preview | `https://YOUR-PROJECT-*.vercel.app` |
   | Local | `http://localhost:3000` |

4. **Authorized redirect URIs**

   | Environment | Redirect URI |
   |-------------|--------------|
   | Vercel production | `https://YOUR-PROJECT.vercel.app/api/auth/callback/google` |
   | Local | `http://localhost:3000/api/auth/callback/google` |
   | Custom domain | `https://your-domain.com/api/auth/callback/google` |

5. Save **Client ID** + **Client Secret**

### 3. App env vars (Vercel — then redeploy)

Project → **Settings → Environment variables** (Production + Preview as needed):

```
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_GOOGLE_ID=<Client ID>
AUTH_GOOGLE_SECRET=<Client Secret>
AUTH_TRUST_HOST=true
AUTH_URL=https://YOUR-PROJECT.vercel.app
ADMIN_EMAILS=you@gmail.com
# Postgres: usually injected automatically by Neon Marketplace integration
# POSTGRES_URL=postgres://...   (if not auto-injected)
```

Google OAuth redirect path: `/api/auth/callback/google`

### 4. Fix Auth.js “Server configuration” errors

| Check | What to do |
|-------|------------|
| `AUTH_SECRET` | Set and non-empty in Vercel env |
| Google ID/Secret | `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` (or `GOOGLE_*`) |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | Exact production URL, no trailing slash |
| Redeploy | Env changes need a **new deployment** |
| Google test users | Consent Testing → account must be listed |
| Redirect URI | Exact `https://PROJECT.vercel.app/api/auth/callback/google` |

**Diagnostics (safe):**  
`https://YOUR-PROJECT.vercel.app/api/auth/debug`  
Expect `readyForGoogleSso: true`.

**Attendance / database diagnostics:**  
`https://YOUR-PROJECT.vercel.app/api/attendance/diag`  
Expect `hasPostgresUrl: true`, `ping: true`, `workersEmailColumn: true`, `attendanceDaysTable: true`, `readyForCheckIn: true`.

**Vercel logs:** Function logs after Google sign-in show named Auth.js/DB errors.

### 5. Common Google errors

| Symptom | Cause |
|---------|--------|
| `redirect_uri_mismatch` | Redirect URI missing/wrong |
| App blocked / not verified | User not on **Test users** while Testing |
| `invalid_client` | Bad Client ID/Secret or env not applied |
| Admin 403 | Email not in `ADMIN_EMAILS` |

## Environment variables

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | **Required.** `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` / `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `AUTH_TRUST_HOST` | `true` on Vercel |
| `AUTH_URL` | e.g. `https://YOUR-PROJECT.vercel.app` |
| `POSTGRES_URL` | **Required.** Neon/Vercel Postgres connection string |
| `DATABASE_URL` | Alias accepted by the app/migrate script |
| `ADMIN_EMAILS` | Comma-separated Google emails for `/admin` |
| `OFFICE_NAME` / `OFFICE_CITY` | Welcome/goodbye messages |
| `OFFICE_PUBLIC_IP` | Static office egress IP (backup verification) |
| `OFFICE_LAT` / `OFFICE_LNG` | Office GPS centroid |
| `OFFICE_RADIUS_METERS` | Geofence radius (default `100`) |
| `OFFICE_TIMEZONE` | IANA TZ (default `Africa/Dar_es_Salaam`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | **Admin sites map.** Browser key — enable Places API (New), Maps JavaScript API, Geocoding API; restrict HTTP referrer |

See `.env.example`. Never commit real secrets.

## Multi-site project locations

Admins register remote project sites (name, address, lat/lng, radius) on `/admin/sites` using **Google Places search + map pin**. Workers choose **Head office (default)** or any **active** site at check-in.

| Rule | Behavior |
|------|----------|
| HQ default | No site selected → existing `OFFICE_*` IP / GPS path |
| Any active site | Worker may pick any row with `active = true` |
| Site check-in | GPS must be within `radius_m` of the site pin (`site_gps`) |
| Inactive site | Hidden from picker; stale id → `SITE_UNAVAILABLE` |

### Google Maps setup (admin only)

1. [Google Cloud Console](https://console.cloud.google.com/) → billing enabled (Maps Platform free monthly credit applies).
2. Enable **Places API (New)**, **Maps JavaScript API**, **Geocoding API**.
3. Create a **browser API key**; restrict by HTTP referrer to your Vercel domain + `localhost`.
4. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` on Vercel → **Redeploy**.
5. `npm run db:migrate` (applies `sites` table + `site_id` columns).

Worker check-in does **not** load Google Maps — only the admin sites UI does.

## Apps by role

The post-login launcher at `/` lists **My workspace** apps for everyone and a
**Management** group for roles with the matching capability.

| App | Route | Visible to |
|-----|-------|-----------|
| Attendance | `/check-in` | Everyone |
| My Time Off | `/time-off` | Everyone |
| Attendances | `/admin/attendance` | HR, Accountant, Director, Admin |
| Attendance Report | `/admin/reports` | HR, Accountant, Director, Admin |
| Employees | `/admin/employees` | HR, Accountant, Marketing, Director, Admin |
| Time Off (approvals) | `/admin/time-off` | HR, Accountant, Marketing, Director, Admin |
| Recruitment | `/admin/recruitment` | HR, Marketing, Director, Admin |
| Sites | `/admin/sites` | Admin |
| Worker Accounts | `/admin/workers` | Admin |

Signed-in users without a management capability are redirected from
`/admin/*` back to the launcher, and each module page is guarded server-side
by its capability (not just by the filtered menu).

## Worker flow

1. Open `/` (website or installed PWA) → **Sign in with Google**
2. Land on the app launcher and open **Attendance** or **My Time Off**
3. Pick **Work location**: Head office (default) or a project site
4. Tap **Check In** / **Check Out**
5. App **requires location permission**
6. On success: welcome/goodbye using site name or office name/city

Server verifies GPS inside the selected geofence **or** (HQ only) client IP matches `OFFICE_PUBLIC_IP`.

## Admin flow

1. Sign in with a Google account listed in `ADMIN_EMAILS`
2. `/admin` overview, workers, **sites**, reports + CSV
3. Sites: search on Google map → pin → save radius → activate

## Deploy (GitHub → Vercel)

1. Push to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo (Next.js detected).
3. **Marketplace → Storage → Neon Postgres** → install/integrate (injects `POSTGRES_URL`).
4. Set Auth + office env vars (above).
5. Add production Google redirect URI for the Vercel domain.
6. Deploy.
7. Apply schema:
   ```bash
   # from a machine with POSTGRES_URL (local .env or vercel env pull)
   npm run db:migrate
   ```
   Or paste `db/schema.sql` into the Neon/psql SQL editor once.
8. Open `/api/attendance/diag` → `readyForCheckIn: true`.

## Local development

```bash
npm install
cp .env.example .env   # fill Google + POSTGRES_URL + office values
npm run db:migrate     # applies db/migrations + db/schema.sql
npm run dev            # http://localhost:3000
```

## Migrations

| Path | Purpose |
|------|---------|
| `db/migrations/*.sql` | Ordered files recorded in `schema_migrations` |
| `db/schema.sql` | Idempotent full schema (safe to re-run) |
| `npm run db:migrate` | Runs pending migrations + schema.sql |
| `db/migrations/0004_project_sites.sql` | `sites` table + attendance `site_id` |

## API summary

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET/POST /api/auth/*` | — | NextAuth (Google) |
| `GET /api/auth/session` | session | Who am I + isAdmin |
| `GET /api/attendance/today` | worker | Today’s status |
| `POST /api/check-in` / `check-out` | worker | GPS required; optional `siteId` |
| `GET /api/sites` | worker | Active project sites for picker |
| `GET/POST /api/admin/sites` | admin | List / create sites |
| `PATCH/DELETE /api/admin/sites/[id]` | admin | Update / deactivate site |
| `GET /api/admin/*` | admin | Workers / reports / CSV |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Postgres migrations |
