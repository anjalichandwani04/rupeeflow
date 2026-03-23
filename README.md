## RupeeFlow

Next.js expense tracker with:

- Google auth (Auth.js / NextAuth)
- Supabase-backed `transactions`
- Dashboard with a `Sync Gmail` button (demo insert)

## Getting Started

### 1) Install dependencies

```bash
npm i
```

### 2) Configure environment variables

Copy `.env.example` to `.env.local` and fill in values.

```bash
cp .env.example .env.local
```

### 3) Create the Supabase table

Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.

### 4) Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000`, sign in, and visit `/dashboard`.

## Notes

- `Sync Gmail` currently inserts a **demo** transaction for the signed-in user.
- When you’re ready, replace `insertDemoSyncedTransaction` with real Gmail parsing/import.

## NextAuth + Supabase (`@auth/supabase-adapter`)

- Sessions use **`strategy: "database"`** so users/sessions are stored in Supabase.
- The adapter writes to schema **`next_auth`** (tables: `next_auth.users`, `next_auth.accounts`, …), **not** `public.users`.
- Run `supabase/next_auth_schema.sql` in the Supabase SQL Editor, then in **Settings → API → Exposed schemas**, add **`next_auth`**.
- Env vars (match Vercel exactly):
  - **`SUPABASE_SERVICE_ROLE_KEY`** — adapter `secret` (service role).
  - **`NEXT_PUBLIC_SUPABASE_URL`** or **`SUPABASE_URL`** — adapter `url` (same project URL as the dashboard).
- Optional: mirror into `public.users` with `supabase/optional_public_users_mirror.sql`.

## Gmail API

- Enable the **Gmail API** in your Google Cloud project.
- Make sure your OAuth consent screen includes the Gmail read-only scope:
  - `https://www.googleapis.com/auth/gmail.readonly`
- After adding scopes, **sign out and sign in again** so Google shows the updated consent screen.
