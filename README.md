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

### How the project works (human walkthrough)

- **Sign-in**: users authenticate with Supabase Auth (email/password).
- **Role lookup**: app reads `profiles` to determine whether the user is a learner, facilitator, or admin.
- **Learner flow**:
  - learner selects a venue
  - browser provides GPS coordinates
  - backend calculates distance from learner to venue center
  - backend accepts/rejects clock-in based on allowed radius
- **Dashboard flow**:
  - facilitator/admin can view today’s clock-ins
  - facilitator/admin can create, edit, activate/deactivate, and conditionally delete venues
- **Data safety**:
  - RLS is enabled on tables
  - browser only reads its own profile row
  - sensitive venue/clock-in operations run through backend with service role checks

---

**User Login Info for Testing**  // This is provided for when you want to test both Learner and Facilitator functionality
Facilitators/Admins:
- Jarred Lambert (username/password) --> (test.jarred@inala.co.za/cofounder@1234)
- Jason Schwegmann (username/password) --> (test.jason@inala.co.za/cofounder@1234)

Learners:
- Sachin Hockey (username/password) --> (sachin.user@inala.co.za/sachin@1234)
- Auston Lewis (username/password) --> (auston.user@inala.co.za/auston@1234)
- Carly Carter (username/password) --> (carly.user@inala.co.za/carly@1234)


## Local setup

### 1) Create Supabase project + run SQL

In Supabase Dashboard:

- Create a new Supabase project
- Open **SQL Editor** and run:
  - `supabase/schema.sql`
  - `supabase/seed.sql`

### 2) Create sample users + profiles

In Supabase Dashboard:

- **Authentication → Users**: create users (email/password) for:
  - 1–2 learners
  - 1 facilitator/admin

Then insert their profiles (SQL Editor), using the UUIDs from Auth:

```sql
insert into public.profiles (id, full_name, role) values
  ('<learner-uuid>', 'Sachin Hockey', 'learner'),
  ('<facilitator-uuid>', 'Jarred Lambert', 'facilitator');
```

### 3) Backend env + run API

Create env file:

  → `apps/api/.env`

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

Create env file:

 → `apps/web/.env`

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

### Frontend (Vercel)

Set env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (my deployed API URL)

### Backend (Render)

Set env vars:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEB_ORIGIN` (my deployed web URL)
- `PORT` (provided by platform)

Important: **Geolocation often requires HTTPS** in production.
