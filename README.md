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
   - Run the SQL in `supabase/migrations/20260319000000_phase1_foundation.sql` (SQL Editor, or Supabase CLI `db push`).
   - To promote yourself to admin after first signup:
     ```sql
     update public.profiles set role = 'admin' where email = 'you@example.com';
     ```

4. **Run**
   ```bash
   npm run web      # browser
   npm start        # Expo Dev Tools → press `a` for Android emulator / Expo Go
   ```

## Project layout

```
app/                 # expo-router screens
  (auth)/            # sign-in / sign-up
  (tabs)/            # member shell (Home, Media, Events, Groups, Profile)
components/ui/       # shared design-system primitives
features/auth/       # auth hooks / session
lib/supabase/        # client, storage, generated-style types
constants/theme.ts   # design tokens
supabase/migrations/ # Postgres + RLS
```

## Decisions log

See [DECISIONS.md](./DECISIONS.md).

## Phases

Work phase-by-phase per `PROJECT_SPEC.md`. Phase 1 = foundation only.
