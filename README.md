# Jesus House Auburn

Congregation-first member app (Expo + Supabase). Source of truth: `PROJECT_SPEC.md`.

## Stack

- Expo (React Native) + expo-router + TypeScript (strict)
- TanStack Query
- Supabase (Auth, Postgres, RLS, Storage later)

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

3. **Database**
   - Create a Supabase project (if you do not have one).
   - Enable Email auth (Authentication → Providers).
   - Run migrations in order (SQL Editor):
     1. `supabase/migrations/20260319000000_phase1_foundation.sql`
     2. `supabase/migrations/20260319010000_phase2_members.sql`
     3. `supabase/migrations/20260319020000_phase3_media.sql`
   - To promote yourself to admin after first signup:
     ```sql
     update public.profiles set role = 'admin' where email = 'you@example.com';
     ```

4. **Run**
   ```bash
   npm run web      # browser
   npm start        # Expo Dev Tools → press `a` for Android emulator / Expo Go
   ```

5. **Deploy web (Vercel)**
   - Push this repo to GitHub (already linked).
   - Import the project at [vercel.com/new](https://vercel.com/new) **or** run `npx vercel`.
   - Set environment variables (same as `.env`):
     - `EXPO_PUBLIC_SUPABASE_URL`
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Build settings are in `vercel.json` (`expo export -p web` → `dist`).
   - In Supabase → **Authentication → URL Configuration**, add your Vercel URL to **Site URL** and **Redirect URLs** (e.g. `https://your-app.vercel.app/**`).

## Project layout

```
app/                 # expo-router screens
  (auth)/            # sign-in / sign-up
  onboarding/        # new-member setup flow
  (tabs)/            # Home, Directory, Events, Groups, Profile
  member/[id].tsx    # directory member detail
components/ui/       # shared design-system primitives
features/auth/       # auth hooks / session
features/members/    # directory, privacy, households
features/media/      # sermons, live, audio, photo albums
lib/supabase/        # client, storage, types
constants/theme.ts   # design tokens
supabase/migrations/ # Postgres + RLS
```

## Decisions log

See [DECISIONS.md](./DECISIONS.md).

## Phases

Work phase-by-phase per `PROJECT_SPEC.md`. Phase 1 = foundation. Phase 2 = members. Phase 3 = media.
