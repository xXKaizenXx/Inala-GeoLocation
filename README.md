## Geo Location Clock In (Supabase + Node/TS + React/TS)

Small web app for learners to **clock in only when physically within a venue radius**, plus a facilitator/admin dashboard to see today’s clock-ins.

### Tech stack

- **Database/Auth**: Supabase (Postgres + Supabase Auth)
- **Backend API**: Node.js + TypeScript + Express
- **Frontend**: React + TypeScript (Vite)

### What’s implemented

- **Supabase schema**: `profiles`, `venues`, `clock_ins` with RLS enabled
- **Auth**: users must sign in (Supabase email/password)
- **Clock-in validation**: backend calculates distance to venue (Haversine) and rejects outside radius
- **Learner UI**: pick venue → get browser location → clock in → clear accept/reject feedback
- **Map preview**: shows the selected venue, allowed radius, and (after “Get my location”) the user’s position/accuracy
- **Facilitator/admin UI**: “Today’s clock-ins” table
- **Venue management** (admin/facilitator): create/edit/activate-deactivate/delete venues (delete only allowed when a venue has no clock-ins)

---

## Local setup

### 1) Create Supabase project + run SQL

- Create a Supabase project
- In Supabase SQL Editor, run:
  - `supabase/schema.sql`
  - `supabase/seed.sql`

This seeds **2 venues** with coordinates and radii.

### 2) Create sample users + profiles

In Supabase Dashboard:

- **Authentication → Users**: create users (email/password) for:
  - 1–2 learners
  - 1 facilitator/admin

Then insert their profiles (SQL Editor), using the UUIDs from Auth:

```sql
insert into public.profiles (id, full_name, role) values
  ('<learner-uuid>', 'Ava Learner', 'learner'),
  ('<facilitator-uuid>', 'Finn Facilitator', 'facilitator');
```

### 3) Backend env + run API

Copy env file:

- `apps/api/.env.example` → `apps/api/.env`

Fill:

- `SUPABASE_URL`: from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY`: from Supabase project settings (**keep secret**)
- `WEB_ORIGIN`: `http://localhost:5173`

Install deps (root):

```bash
npm install
```

Run API:

```bash
npm run -w @inala/api dev
```

API runs on `http://localhost:4000`.

### 4) Frontend env + run web app

Copy env file:

- `apps/web/.env.example` → `apps/web/.env`

Fill:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL=http://localhost:4000`

Run web:

```bash
npm run -w @inala/web dev
```

Open `http://localhost:5173`.

---

## Usage

### Learner

- Sign in with a learner account
- Go to **Learner** (use the header button)
- Click **Get my location** (browser permission required)
- Click **Clock in**

If you’re outside the radius, the backend responds with:

- `reason: OUTSIDE_RADIUS`
- `distanceM` vs `allowedRadiusM`

### Facilitator/Admin

- Sign in with a facilitator/admin account
- Open **Dashboard** (use the header button)
- View today’s clock-ins
- Manage venues (create/edit/activate-deactivate/delete-safe)

---

## Deployment notes

### Frontend (Vercel/Netlify)

Set env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (your deployed API URL)

### Backend (Railway/Render/Fly.io)

Set env vars:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEB_ORIGIN` (your deployed web URL)
- `PORT` (provided by platform)

Important: **Geolocation often requires HTTPS** in production.

