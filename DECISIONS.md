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
