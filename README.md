# Nilric Smart Attendance

Location-based worker attendance **PWA** with **Google SSO**, deployed on **Netlify**, stored in **Netlify Database (Postgres)**.

Workers sign in with Google (prevents credential sharing). Location access is **mandatory** for check-in and check-out. The app welcomes workers to the office on check-in and wishes them a safe journey on check-out.

## Features

- **Google SSO** for workers and admins (Auth.js / NextAuth)
- **Admin access control** via `ADMIN_EMAILS` allowlist
- **Mandatory GPS** before check-in/out (app blocks if location is denied)
- Dual-layer verification: GPS geofence + office Wi-Fi IP backup
- Location-aware **welcome / goodbye** messages using `OFFICE_NAME` + `OFFICE_CITY`
- Installable PWA (Serwist) with install prompt
- Admin dashboard: workers, reports, CSV export

## Stack

| Piece | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth v5 (`next-auth`) + Google |
| Database | Netlify Database (`@netlify/database`) |
| PWA | Serwist (`@serwist/turbopack`) |
| Hosting | Netlify (OpenNext adapter) |

## Google OAuth setup (complete checklist)

Your pasted steps (Credentials → Create Client → **Web application**) are the right core flow. You also need consent screen, origins, and redirect URIs.

### 1. Project + OAuth consent screen
1. Open [Google Cloud Console](https://console.cloud.google.com/) and select/create a project.
2. **APIs & Services → OAuth consent screen**
3. User type: **External**
4. App name: `Nilric Smart Attendance` (or similar) + support/dev emails
5. Scopes: `openid`, `email`, `profile` (Auth.js defaults; no extra Google APIs required)
6. If status is **Testing**, add every worker/admin Google email under **Test users**

### 2. Create OAuth client
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Name: e.g. `nilric-web`
4. **Authorized JavaScript origins**

   | Environment | Origin |
   |-------------|--------|
   | Netlify production | `https://YOUR-SITE.netlify.app` |
   | Deploy previews | `https://deploy-preview-N--YOUR-SITE.netlify.app` |
   | Local Netlify | `http://localhost:8888` |

5. **Authorized redirect URIs** (must match NextAuth exactly)

   | Environment | Redirect URI |
   |-------------|--------------|
   | Netlify production | `https://YOUR-SITE.netlify.app/api/auth/callback/google` |
   | Local Netlify | `http://localhost:8888/api/auth/callback/google` |
   | Custom domain | `https://your-domain.com/api/auth/callback/google` |

6. Save and copy **Client ID** + **Client Secret**

### 3. App env vars (Netlify — then redeploy)

Set in **Site settings → Environment variables** (available to Functions; Production + any previews you use):

```
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_GOOGLE_ID=<Client ID>
AUTH_GOOGLE_SECRET=<Client Secret>
AUTH_TRUST_HOST=true
AUTH_URL=https://YOUR-SITE.netlify.app
ADMIN_EMAILS=you@gmail.com
```

Aliases `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are also accepted.

Callback path used by this app: `/api/auth/callback/google`

### 4. Fix “Server error — problem with the server configuration”

That message is Auth.js failing to start. Work through this list:

| Check | What to do |
|-------|------------|
| `AUTH_SECRET` | Must be set and non-empty in Netlify Functions env |
| Google ID/Secret | Set `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` (or GOOGLE_* aliases) |
| `AUTH_TRUST_HOST` | Must be `true` on Netlify (reverse proxy) |
| `AUTH_URL` | `https://YOUR-SITE.netlify.app` (exact production URL) |
| Redeploy | Env changes require a **new deploy** |
| Google test users | If consent is Testing, the signing-in account must be listed |
| Redirect URI | Exact `https://SITE.netlify.app/api/auth/callback/google` |

**Diagnostics (safe):** open  
`https://YOUR-SITE.netlify.app/api/auth/debug`  
You should see `readyForGoogleSso: true` and all required `has*` flags true. Secret values are never returned.

**Attendance / database diagnostics:**  
`https://YOUR-SITE.netlify.app/api/attendance/diag`  
Shows whether Netlify Database is reachable, the `workers.email` column exists, and `attendance_days` is present. Fix any `false` / error before retrying check-in.

**Netlify logs:** Functions logs after clicking *Sign in with Google* will show clearer errors (e.g. missing `AUTH_SECRET`) now that config fails fast with named errors.

### 5. Common Google errors (after auth config is fixed)

| Symptom | Cause |
|---------|--------|
| `redirect_uri_mismatch` | Redirect URI missing/wrong path |
| App blocked / not verified | User not on **Test users** while consent is Testing |
| `invalid_client` | Bad Client ID/Secret or env not applied after redeploy |
| Admin 403 | Email not in `ADMIN_EMAILS` |

Auth is wired in `lib/auth.ts` + `app/api/auth/[...nextauth]/route.ts`.



## Environment variables

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | **Required.** `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` / `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `AUTH_TRUST_HOST` | Set `true` on Netlify |
| `AUTH_URL` | Production site URL, e.g. `https://YOUR-SITE.netlify.app` |
| `ADMIN_EMAILS` | Comma-separated Google emails allowed into `/admin` |
| `OFFICE_NAME` | e.g. `Nilric HQ` |
| `OFFICE_CITY` | e.g. `Dar es Salaam` |
| `OFFICE_PUBLIC_IP` | Static office egress IP (backup verification) |
| `OFFICE_LAT` / `OFFICE_LNG` | Office GPS centroid |
| `OFFICE_RADIUS_METERS` | Geofence radius (default `100`) |
| `OFFICE_TIMEZONE` | IANA TZ for attendance day (default `Africa/Dar_es_Salaam`) |

See `.env.example`. Diagnostics: `GET /api/auth/debug`.

## Worker flow

1. Open `/check-in` → **Sign in with Google**
2. Tap **Check In** / **Check Out**
3. App **requires location permission** — if denied, nothing is submitted
4. On success:
   - Check-in: `Welcome to Nilric HQ, Dar es Salaam, Amina!`
   - Check-out: `Goodbye Amina — have a safe journey!`

Server still verifies:
- GPS inside office radius **or**
- Client IP matches `OFFICE_PUBLIC_IP` (backup if GPS is weak on Wi-Fi)

## Admin flow

1. Sign in with a Google account listed in `ADMIN_EMAILS`
2. `/admin` — today’s overview
3. `/admin/workers` — list, rename, activate/deactivate
4. `/admin/reports` — filters + CSV

Workers are auto-created on first successful Google sign-in / check-in.

## Deploy (GitHub → Netlify)

1. Push to GitHub.
2. Netlify → **Add new site → Import from Git**.
3. Enable **Netlify Database**.
4. Set all env vars above.
5. Add the production Google redirect URI.
6. Deploy. Confirm migration `0002_google_sso_workers.sql` applies.

## Local development

```bash
npm install
cp .env.example .env   # fill Google + office values
npx netlify init
npx netlify dev        # http://localhost:8888
```

Apply migrations locally:

```bash
npx netlify database migrations apply
```

## API summary

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET/POST /api/auth/*` | — | NextAuth (Google) |
| `GET /api/auth/session` | session | Who am I + isAdmin |
| `GET /api/attendance/today` | worker | Today’s check-in/out status |
| `POST /api/check-in` | worker | GPS required |
| `POST /api/check-out` | worker | GPS required |
| `GET /api/admin/workers` | admin | List workers |
| `GET/PATCH /api/admin/workers/:id` | admin | Detail / update |
| `POST /api/admin/workers/:id/activate\|deactivate` | admin | Toggle active |
| `GET /api/admin/attendance` | admin | Report JSON |
| `GET /api/admin/attendance.csv` | admin | CSV export |

## Security notes

- Identity = Google account email (no shared password check-ins)
- GPS is mandatory on the client; server still dual-verifies
- GPS can be spoofed — IP backup + method/distance columns help audits
- Admin is allowlist-only via Google email
- Failed verification does not write attendance

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | `netlify dev` (app + local DB) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
