# ClearSight — eye test platform (scaffold)

A free, browser-based vision pre-screening platform. This is phase 1: a
working Next.js + Prisma + Neon project with the database schema, a basic
intake flow, and the API routes the test modules will write to next.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **Prisma** as the ORM
- **Neon** (serverless Postgres) as the database
- **Zod** for request validation

## What's here

- `prisma/schema.prisma` — `Patient`, `TestSession`, and `ModelVersion`
  models. `TestSession` has a column for every measurement the eye test
  produces (acuity, IPD, SPH/CYL, astigmatism, contrast, color vision,
  macular check, duochrome) plus ML output fields, so each test module can
  write its results to the same row as it completes.
- `src/app/page.tsx` — landing page.
- `src/app/test/page.tsx` — intake form (name, age, country, three symptom
  questions) that creates a `Patient` + `TestSession` via the API and
  redirects to the session page.
- `src/app/sessions/[id]/page.tsx` — session detail page. Shows intake data
  now; will show the full report once the test modules and ML service exist.
- `src/app/api/sessions/route.ts` — `POST` creates a session, `GET` lists
  recent sessions.
- `src/app/api/sessions/[id]/route.ts` — `GET` fetches a session, `PATCH`
  updates it (this is the endpoint each test module will call with its
  results).
- `src/app/api/health/route.ts` — `GET /api/health` checks the Neon
  connection.

## Setup

1. **Create a Neon project** at [neon.tech](https://neon.tech) if you don't
   have one. From the project dashboard, copy both the **pooled** connection
   string and the **direct** connection string.

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Paste your Neon connection strings into `.env`:

   ```
   DATABASE_URL="postgresql://...&pgbouncer=true&connect_timeout=15"
   DIRECT_URL="postgresql://..."
   ```

4. **Create the database schema**

   ```bash
   npx prisma migrate dev --name init
   ```

   This creates the tables in Neon and generates the Prisma client.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`. Check `http://localhost:3000/api/health`
   to confirm the database connection — it should return
   `{"status":"ok","database":"connected"}`.

6. **Try the flow**: go to `/test`, fill in the intake form, and submit. You
   should land on `/sessions/<id>` with your intake data pulled live from
   Neon. `npx prisma studio` is a quick way to browse the rows directly.

## Accounts & email verification

Registration is at `/register`, login at `/login`. The flow is:

1. `/register` — collects first/last name, username (with a live + on-demand
   availability check against `/api/auth/username-available`), email,
   phone, address, and password. `POST /api/auth/register` creates the
   `User` (unverified), generates a 6-digit code, and emails it via
   Hostinger SMTP.
2. `/verify?email=...` — the user enters the code. `POST /api/auth/verify`
   checks it against the hashed `VerificationToken`, marks `emailVerified`,
   and logs them in (sets the `session_token` cookie, backed by the
   `Session` table).
3. `/login` — username or email + password. If the account isn't verified
   yet, it redirects back to `/verify`.

`GET /api/auth/me` returns the logged-in user (404/401 if not signed in) —
use this from client components like a nav bar.

### Setting up email sending

Add Hostinger's SMTP details to `.env`:

```
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_USER="ayyan@blackzero.org"
SMTP_PASS="<the mailbox password from Hostinger>"
```

After changing the schema, run the migration again:

```bash
npx prisma migrate dev --name add_auth
```

## Next steps

- **Forgot password** — request + reset flow, reusing the same
  `VerificationToken` table with `type: PASSWORD_RESET`.
- **User management page** — view/edit profile, change password.
- **Extensive questionnaire** — a sidebar-driven set of intake questions
  tied to the `User`, asked once and reused for future sessions ("if
  already answered, skip straight to the test").
- **Gate `/test`** — require login (and a completed questionnaire) before
  starting a screening, and link `TestSession` to `User` instead of the
  current anonymous `Patient`.
- Port the V7 test modules (tumbling-E acuity, astigmatism dial, duochrome,
  contrast, Amsler grid, color plates, FaceMesh-based IPD/distance tracking)
  into `src/components/`.
- Stand up the FastAPI ML service and the retraining job.

# eyesight
