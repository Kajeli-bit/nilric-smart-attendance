# Nilric Smart Attendance

Location-based worker attendance PWA built with **Next.js**, deployed on **Netlify**, and stored in **Netlify Database (Postgres)**.

Workers check in/out from their phones. Verification is dual-layer:

1. **Office Wi-Fi IP** — if the request comes from your office's static public IP, check-in succeeds immediately (no GPS required).
2. **GPS geofence** — if not on office Wi-Fi, coordinates are checked against the office centroid within a configurable radius (default 100 m).

## Features

- Installable PWA (Serwist) with iOS "Add to Home Screen" hint
- Employee code + name identity (auto-create on first successful check-in)
- Check-in **and** check-out with double-submit protection
- Admin dashboard: workers CRUD, daily reports, CSV export
- Office config via environment variables
- Online-only check-in (no offline queue)

## Stack

| Piece | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Netlify Database (`@netlify/database`) |
| PWA | Serwist (`@serwist/turbopack`) |
| Hosting | Netlify (OpenNext adapter, automatic) |

## Local development

Requires **Node ≥ 22.12**.

```bash
npm install
cp .env.example .env
# Edit .env with real office IP/coords and ADMIN_PASSWORD
npx netlify init   # or link an existing site
npx netlify dev    # starts app + local Netlify Database
```

Apply migrations locally:

```bash
npx netlify database migrations apply
```

If you run `next dev` without Netlify Database connection, API routes that hit Postgres will fail. Prefer `netlify dev` for full-stack testing.

### Manual migration apply (local)

Migrations live in `netlify/database/migrations/` and are applied automatically on Netlify deploys and deploy previews.

## Environment variables

Set these in **Netlify → Site settings → Environment variables** (and copy to `.env` locally):

| Variable | Description |
|----------|-------------|
| `OFFICE_PUBLIC_IP` | Office static public egress IP (Layer 1) |
| `OFFICE_LAT` | Office GPS latitude |
| `OFFICE_LNG` | Office GPS longitude |
| `OFFICE_RADIUS_METERS` | GPS geofence radius (default `100`) |
| `OFFICE_TIMEZONE` | IANA timezone for attendance day (default `Africa/Dar_es_Salaam`) |
| `ADMIN_PASSWORD` | Admin dashboard password |

**Important:** `OFFICE_PUBLIC_IP` must be a **static** IP. Find it by connecting a device to office Wi-Fi and searching "What is my IP". Dynamic IPs break Layer 1.

## Deploy to Netlify from GitHub

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import from Git** → select the repo.
3. Enable **Netlify Database** (Data & Storage → Database) for the site.
4. Set the environment variables listed above.
5. Deploy. Confirm migrations appear in the deploy logs.

`netlify.toml` pins Node 22. Do **not** manually pin `@netlify/plugin-nextjs` — Netlify’s Next.js adapter is automatic.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/check-in` | Worker check-in / check-out UI |
| `/admin/login` | Admin password login |
| `/admin` | Today’s overview |
| `/admin/workers` | Worker CRUD |
| `/admin/reports` | Attendance reports + CSV |

### API

| Endpoint | Description |
|----------|-------------|
| `POST /api/check-in` | Verify + record check-in |
| `POST /api/check-out` | Verify + record check-out |
| `POST /api/admin/login` | Set admin cookie |
| `GET/POST /api/admin/workers` | List / create workers |
| `GET/PATCH /api/admin/workers/:id` | Read / update worker |
| `POST /api/admin/workers/:id/activate` | Reactivate |
| `POST /api/admin/workers/:id/deactivate` | Deactivate |
| `GET /api/admin/attendance` | Report JSON |
| `GET /api/admin/attendance.csv` | CSV export |

## Verification algorithm

```
Layer 1: client IP (x-nf-client-connection-ip) === OFFICE_PUBLIC_IP
  → success method=office_ip (GPS not required)

Layer 2: haversine(gps, office) <= OFFICE_RADIUS_METERS
  → success method=gps

else → 422 NOT_VERIFIED
```

Attendance day uniqueness uses `OFFICE_TIMEZONE` (not UTC). Timestamps are stored in UTC.

## Testing notes

### Local Layer 1

```bash
# In .env
OFFICE_PUBLIC_IP=127.0.0.1
OFFICE_LAT=-6.7924
OFFICE_LNG=39.2086
```

```bash
curl -s -X POST localhost:8888/api/check-in \
  -H 'Content-Type: application/json' \
  -H 'x-nf-client-connection-ip: 127.0.0.1' \
  -d '{"employeeCode":"NIL-001","name":"Test User"}'
```

### Local Layer 2

Omit the IP header and send GPS near/far:

```bash
curl -s -X POST localhost:8888/api/check-in \
  -H 'Content-Type: application/json' \
  -d '{"employeeCode":"NIL-002","name":"Near Office","gps":{"lat":-6.7925,"lng":39.2087}}'
```

### Deployed checks

- Office Wi-Fi: deny geolocation → still succeeds via IP layer.
- Cellular outside radius: expect `422 NOT_VERIFIED`.
- Install PWA on Android; iOS Share → Add to Home Screen.
- Toggle airplane mode: submit should be blocked as offline.

## Security notes (v1)

- Admin auth is a single shared password + httpOnly cookie. Rotate via `ADMIN_PASSWORD`.
- GPS coordinates are client-supplied and can be spoofed; the IP layer is stronger when the office IP is static.
- CSV export sanitizes spreadsheet formula characters.
- Failed verification does **not** auto-create workers.

## Billing note

Netlify Database is credit-based. Database **storage** was free until July 1, 2026 — check current Netlify pricing before production scale.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | `netlify dev` (full local stack) |
| `npm run dev:next` | Plain `next dev` (DB routes need Netlify env) |
| `npm run build` | Production Next.js build (Serwist SW generated) |
| `npm run lint` | ESLint |
