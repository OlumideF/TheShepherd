# Decisions log

Product and technical choices that are not obvious from the code. Append; do not rewrite history.

## 2026-03-19 — Phase 1 foundation

| Decision | Choice | Why |
|---|---|---|
| App display name | **Jesus House Auburn** | Product owner renamed from “The Shepherd”; logo + UI brand mark. |
| Congregation | **Jesus House Auburn** (RCCG) | Same as app display name. |
| Auth for Phase 1 | **Email + password only** | Confirmed; phone OTP deferred. |
| Role model | Enum on `profiles.role` (`member`, `group_leader`, `admin`) | Simpler than a join table for v1; can migrate later without rewriting features. |
| Membership status | `visitor` \| `pending` \| `active` \| `inactive` | Supports onboarding / visitors before Phase 2 directory work. |
| Role escalation | Trigger locks `role` + `membership_status` for non-admins | Avoids RLS recursion from self-referential WITH CHECK policies. |
| Theme | Logo navy `#0A2540`, seal green `#1F7A3A`, seal red `#C41E3A`; Fraunces + Source Sans 3 | Derived from Jesus House Auburn logo; primary buttons use navy. |
| Logo asset | `assets/images/church-logo.png` | Official mark for BrandMark + splash. |
| Nav shell tabs | Home, Media, Events, Groups, Profile | Placeholders for later phases so the shell is stable. |
| Session storage | SecureStore (native) / localStorage (web) | Standard Expo + Supabase pattern. |
| DB types | Hand-written `lib/supabase/types.ts` mirroring migration | Until `supabase gen types` is wired to a live project. |

## 2026-03-19 — Phase 2 members

| Decision | Choice | Why |
|---|---|---|
| Directory visibility | Opt-in (`directory_visible`, default false) | Privacy-first; members choose to be findable. |
| Field privacy | `show_email` / `show_phone` / `show_photo` | Spec requires choosing which fields are shown; photo defaults on. |
| Field masking | `member_directory` view | Masks contact fields server-side; RLS still applies via `security_invoker`. |
| Household linking | Create + 6-char `invite_code` join | Simple family linking without a separate invite table for v1. |
| Onboarding | Welcome → profile → privacy → household → visitor/member intent | Lightweight; sets `onboarding_completed_at`; member intent → `pending`. |
| Membership lock | Trigger allows status change only when completing onboarding | Keeps role lock; lets `complete_onboarding` RPC set visitor/pending. |
| Tabs | Directory tab added; Media hidden (`href: null`) until Phase 3 | Keeps tab bar focused on built features. |

## 2026-03-19 — Phase 3 media

| Decision | Choice | Why |
|---|---|---|
| Video | Official YouTube IFrame (`react-native-youtube-iframe` + web iframe) | Spec forbids scraping/downloading YouTube. |
| Live fallback | Same `media_item`; clear `is_live`, keep/update `youtube_id` to archive | YouTube auto-archives live → VOD. |
| Audio | `expo-audio` + Supabase Storage `sermon-audio` bucket | Self-hosted MP3; background playback enabled. |
| Offline audio | Download to document dir via `expo-file-system` | Spec requires offline for self-hosted audio (mobile). |
| Photos | `photo_albums` + `photos` + `photo-albums` bucket | Event link nullable until Phase 4. |
| Admin publishing | Deferred to Phase 7 | Members can view; empty states until content exists. |
| Audio UI | Show player only when `audio_status = ready` | Spec: no dead button / coming soon. |


| Decision | Choice | Why |
|---|---|---|
| Web output | `single` (SPA) | Auth + dynamic `/member/[id]` routes; Vercel rewrites all paths to `/`. |
| Host | Vercel via `vercel.json` | Official Expo guide; build `expo export -p web`, output `dist`. |
| Secrets | Vercel env vars for `EXPO_PUBLIC_*` | Inlined at build time; never commit `.env`. |
