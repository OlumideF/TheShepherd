# Jesus House Auburn

Congregation-first member app (Expo + Supabase). Source of truth: `PROJECT_SPEC.md`.

## Stack

- Expo (React Native) + expo-router + TypeScript (strict)
- TanStack Query
- Supabase (Auth, Postgres, RLS, Storage, Edge Functions)
- Expo Notifications (native push; in-app inbox on all platforms)

## Setup

1. **Install**
   ```bash
   npm install
   ```

2. **Environment**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase project URL and anon key from the Supabase dashboard.
   Optional: `EXPO_PUBLIC_EAS_PROJECT_ID` for native Expo push tokens.

3. **Database**
   - Create a Supabase project (if you do not have one).
   - Enable Email auth (Authentication → Providers).
   - Run migrations in order (SQL Editor):
     1. `supabase/migrations/20260319000000_phase1_foundation.sql`
     2. `supabase/migrations/20260319010000_phase2_members.sql`
     3. `supabase/migrations/20260319020000_phase3_media.sql`
     4. `supabase/migrations/20260319030000_phase4_events.sql`
     5. `supabase/migrations/20260319040000_phase5_communication.sql`
     6. `supabase/migrations/20260319050000_phase6_groups.sql`
     7. `supabase/migrations/20260319060000_phase7_admin.sql` (idempotent; safe to re-run)
   - To promote yourself to admin after first signup:
     ```sql
     update public.profiles set role = 'admin' where email = 'you@example.com';
     ```
   - The account `rccgauburn@gmail.com` is the **super admin** (auto-promoted by Phase 7 migration / signup / login sync).
     After running Phase 7, sign out and back in if the hub is not visible yet.
   - Optional: seed a group and mark yourself leader (needed for group-leader event/broadcast creates):
     ```sql
     insert into public.groups (name) values ('Youth Ministry') returning id;
     -- use the returned id:
     insert into public.group_members (group_id, profile_id, status, role_in_group)
     values ('<group-uuid>', '<your-profile-uuid>', 'approved', 'leader');
     update public.profiles set role = 'group_leader' where id = '<your-profile-uuid>';
     ```

4. **Push delivery (optional but recommended)**
   - Deploy the Edge Function:
     ```bash
     supabase functions deploy send-push
     ```
   - Optional secret: set `PUSH_FUNCTION_SECRET` and pass header `x-push-secret` from cron.
   - Schedule every few minutes (Supabase cron / external) to process event reminders.
   - Publishing an announcement/broadcast/prayer already invokes `send-push` from the client (no-ops if undeployed).

5. **Run**
   ```bash
   npm run web      # browser
   npm start        # Expo Dev Tools → press `a` for Android emulator / Expo Go
   ```
   Note: remote push on Android requires a development build (not Expo Go) from SDK 53+.

6. **Deploy web (Vercel)**
   - Push this repo to GitHub (already linked).
   - Import the project at [vercel.com/new](https://vercel.com/new) **or** run `npx vercel`.
   - Set environment variables (same as `.env`):
     - `EXPO_PUBLIC_SUPABASE_URL`
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
     - `EXPO_PUBLIC_EAS_PROJECT_ID` (optional)
   - Build settings are in `vercel.json` (`expo export -p web` → `dist`).
   - In Supabase → **Authentication → URL Configuration**, add your Vercel URL to **Site URL** and **Redirect URLs** (e.g. `https://your-app.vercel.app/**`).

## Project layout

```
app/                 # expo-router screens
  (auth)/            # sign-in / sign-up
  onboarding/        # new-member setup flow
  (tabs)/            # Home, Directory, Media, Events, Groups, Profile
  member/[id].tsx    # directory member detail
  media/             # sermon + album detail
  events/            # event detail, create, edit
  groups/            # group detail + create
  prayer/            # prayer wall
  notifications/     # in-app inbox
  announcements/     # admin / leader create
  broadcasts/        # admin / leader create
  admin/             # Phase 7 hub: media, albums, roles, moderation
components/ui/       # shared design-system primitives
features/admin/      # admin hooks + permissions
features/auth/       # auth hooks / session
features/members/    # directory, privacy, households
features/media/      # sermons, live, audio, photo albums
features/events/     # calendar, RSVP, recurrence, volunteers
features/communication/  # announcements, prayer, push, broadcasts
features/groups/     # browse/join, roster, messages, attendance
lib/supabase/        # client, storage, types
constants/theme.ts   # design tokens
supabase/migrations/ # Postgres + RLS
supabase/functions/  # Edge Functions (send-push)
```

## Decisions log

See [DECISIONS.md](./DECISIONS.md).

## Phases

Work phase-by-phase per `PROJECT_SPEC.md`. Phase 7 = admin (media publishing, albums, roles, moderation, dashboard).
