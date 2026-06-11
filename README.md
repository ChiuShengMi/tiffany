# Toolbox

Next.js tool site. The first planned tool is a shared calendar with user-based editing history.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

Authentication uses Supabase Auth. User profile data is stored in `public.user_profiles`, keyed by `auth.users.id`.

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

4. Open the Supabase SQL Editor and run `supabase/schema.sql`.
5. Restart the dev server.

## Auth Routes

- `/auth/sign-up`
- `/auth/sign-in`
- `/account`
- `/auth/callback`

## Shared Calendar

The shared calendar is available at:

```txt
/tools/shared-calendar
```

It uses these Supabase tables:

- `calendars`
- `calendar_members`
- `holiday_events`
- `user_events`
- `event_audit_logs`

Holiday sync uses the Nager.Date public holiday API for `TW` and `JP`.

After pulling schema changes, run `supabase/schema.sql` again in the Supabase SQL Editor.

## Checks

```bash
npm run lint
npm run build
```
