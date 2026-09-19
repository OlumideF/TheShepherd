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
| YouTube channel | `@rccgauburn` / `UCHkhJ6h23vTbUW8SZMW5OvQ` | Default Live embed via channel `live_stream`. |
| Live window | Sundays 8:40–12:00 America/Chicago | Typical service window; programmed `is_live` rows override later. |
| Social | Instagram `@rccgauburn`, Facebook page id `61555660897851` | Shown on Home + Live idle state. |

## 2026-09-19 — Phase 4 events

| Decision | Choice | Why |
|---|---|---|
| Event creators | **Admins + group leaders (group-scoped)** | Leaders must attach `group_id` they lead; admins can create church-wide events. |
| Calendar UI | **Full month grid first** | Spec choice; day list under the grid for selected date. |
| RSVP model | `going` / `maybe` / `not_going` (+ auto `waitlisted`) | Capacity counts `going`; over-capacity → waitlist with auto-promote on cancel. |
| Recurrence | **Full iCal RRULE** (`rrule` package, client expand) | One DB row per series; RSVPs keyed by `occurrence_start`. |
| Reminders | Offsets on event + `event_reminder_queue` | Rows scheduled on Going RSVP; Expo push send deferred to Phase 5. |
| Waitlist | Auto-promote next on cancel | Frees a seat without admin action. |
| Timezone | **America/Chicago** | Matches live service window. |
| Groups seam | Minimal `groups` + `group_members` | Needed for leader-scoped creates before Phase 6 browse/join UI. |
| Photo albums | FK `photo_albums.event_id` → `events` | Closes Phase 3 nullable seam. |

## 2026-09-19 — Phase 5 communication

| Decision | Choice | Why |
|---|---|---|
| Announcement writers | **Admins + group leaders** (leaders group-scoped) | Phase 6: leaders post with `group_id`; admins church-wide or any group. |
| Reactions | Fixed emoji set 🙏❤️👍🎉🙌; one row per user/emoji | Spec ask; simple toggle via unique constraint. |
| Comments | Collapsible under each announcement | Spec ask; flat thread for v1. |
| Broadcast writers | **Admins + group leaders** (group-scoped) | Leaders reach their roster; admins any group. |
| Prayer authors | Any signed-in member | Spec ask. |
| Prayer visibility | `public` / `group_only` (+`group_id`) / `private` (author only) | Private = author only; group_only = approved members. |
| Author labels | Snapshot `author_display_name` on insert | Profiles RLS blocks non-directory joins. |
| Notification categories | announcements, events, broadcasts, prayer | Per-category opt-out on Profile. |
| Push delivery | Token register + in-app inbox + `send-push` Edge Function | Best fit for Expo + Supabase without inventing a second backend. |
| Event reminders | `materialize_due_event_reminders` → notifications → Expo | Closes Phase 4 queue; cron or post-publish invoke. |
| Home | Announcements feed primary | Replaces Phase 1 placeholder cards. |

## 2026-09-19 — Phase 6 groups

| Decision | Choice | Why |
|---|---|---|
| Group creators | **Admins + group leaders** | Spec ask; creators auto-become roster leaders via `create_church_group`. |
| Join model | **Approval by default**, toggle `requires_approval` | Leaders can open-join per group without a second join type. |
| Messaging | **Broadcasts + in-group `group_messages`** | Push outreach stays on broadcasts; discussion lives on the group page. |
| Attendance | **Standalone `group_meetings` + `group_attendance`** | Spec ask: meeting date/check-in, not tied to calendar events. |
| Group content | **`announcements.group_id`** (nullable) | Same church-wide table; null = everyone, set = group-scoped RLS + fan-out. |
| Leader promote | **Bump `profiles.role` → `group_leader`** | Via security-definer sync; no auto-demote when leadership ends. |
| Roster visibility | **Approved members see full roster** | Leaders also see pending join requests. |
| Display names | Snapshot `member_display_name` on join | Profiles RLS otherwise hides non-directory members. |

## 2026-09-19 — Phase 7 admin

| Decision | Choice | Why |
|---|---|---|
| Entry | **Admin hub** from Profile (+ Media publish shortcuts) | Spec ask; keeps member tabs clean. |
| Super admin | `rccgauburn@gmail.com` | Congregation owner; JWT + profile email; `ensure_super_admin` on login; only they may grant `admin`. Single idempotent Phase 7 SQL. |
| Media / album writers | Admins + group leaders + `can_upload_media` flag | Spec ask; admins assign the flag on Roles screen. |
| Audio flow | YouTube first, then attach/replace MP3 on same `media_item` | Spec two-step lifecycle; `audio_status = ready` on success. |
| Moderation | Delete announcements, comments, prayers, group messages | Spec ask: all four. |
| Roles UI | Set `role` + `membership_status` + upload flag | Spec ask. |
| Dashboard | Member counts + upcoming events + 7d RSVPs/prayers/reactions | Spec ask: simple engagement mix. |

## 2026-03-19 — Web hosting (Vercel)

| Decision | Choice | Why |
|---|---|---|
| Web output | `single` (SPA) | Auth + dynamic `/member/[id]` routes; Vercel rewrites all paths to `/`. |
| Host | Vercel via `vercel.json` | Official Expo guide; build `expo export -p web`, output `dist`. |
| Secrets | Vercel env vars for `EXPO_PUBLIC_*` | Inlined at build time; never commit `.env`. |
