# PROJECT_SPEC — Church Member App

> Seed this file into the repo (root, or `.cursor/rules`) and treat it as the
> source of truth. When prompting Cursor, start with:
> "Read PROJECT_SPEC.md in full, then begin Phase 1."
> Do NOT try to build the whole app in one pass — work phase by phase.

---

## 1. Product goal

A congregation-first mobile + web app that helps church members stay connected:
manage their profile, watch sermons and view photos, find and RSVP to events,
receive communication, and join groups/ministries. The experience should feel
polished, fast, and modern — this is meant to be a best-in-class member app,
not a generic template. The primary user is the church member; admins get only
the minimum tooling needed to run the app.

---

## 2. Scope

### In scope for v1 (build ONLY these five modules)
1. Member Management & Profiles
2. Media (YouTube video + self-hosted sermon audio + photos)
3. Events & Calendar
4. Communication & Notifications
5. Groups & Ministries
6. Admin — minimum needed to operate the five modules above

### Out of scope for v1 (do NOT build — but design so they can be added later
### without a rewrite; leave clean seams)
- Giving / donations / finance tracking
- Store / purchases / e-commerce
- When these arrive later, they MUST route through a dedicated payment
  processor (Stripe, Tithe.ly, Pushpay). Never store card data or build
  custom payment handling.

---

## 3. Tech stack (use these; ask before substituting)

- **Frontend:** Expo (React Native) + expo-router + TypeScript (strict mode).
  One codebase targeting iOS, Android, and web. TanStack Query for server
  state. Small, typed components.
- **Backend:** Supabase — Postgres, Auth, Storage, Realtime, and Row-Level
  Security. Supabase is the system of record for v1.
- **Video:** YouTube (see §5). Embed only — never scrape, download, or extract
  audio from YouTube.
- **Sermon audio:** self-hosted MP3s in Supabase Storage (see §5).
- **Photos:** Supabase Storage.
- **Push notifications:** Expo Notifications.
- Use latest stable versions; pin them in `package.json`.

---

## 4. Architecture & conventions

- Feature-based structure: `/features/<module>/` holds its screens,
  components, hooks, and queries. Shared UI in `/components/ui`.
- TypeScript strict; no `any`. Generate DB types from Supabase.
- **Row-Level Security on EVERY table.** The app is congregation-facing —
  members may only read/write what their role permits. No table ships without
  an RLS policy; no feature is "done" until its RLS is in place.
- All secrets in environment variables, never in code. Provide `.env.example`.
- Accessible by default (labels, contrast, adequate touch targets).
- Offline-tolerant: graceful failure and cached lists where reasonable.
- Maintain a `README.md` with setup steps and a running decisions log.

---

## 5. Media — YouTube video + self-hosted audio (definitive spec)

Each sermon is ONE `media_item` that carries both a YouTube video and, added
later, an uploaded audio file.

**Lifecycle:** the YouTube video is available first (at/after the service).
After each ministration, an **admin** uploads the sermon MP3, which attaches to
the **same** `media_item`. One sermon = one audio file. The record must be
valid and viewable while audio is still absent.

- **Video:** embed via the official YouTube IFrame player
  (`react-native-youtube-iframe` on native, the web IFrame API on web). Never
  scrape, download, or extract audio from YouTube — it violates YouTube's ToS
  and risks App Store rejection.
- **Live:** embed the church's YouTube live stream. When it ends, YouTube
  auto-archives it into a normal video, so the "fallback to recording"
  requirement is met by swapping the live embed for the archived video id — no
  separate recording pipeline needed.
- **Audio:** native audio player fed by the Supabase Storage MP3. Because this
  is self-hosted (not YouTube), it MAY and SHOULD support background playback
  and offline download.
- **Member sermon screen:** always show the video when `youtube_id` is present;
  show the audio player only when `audio_status = ready`. When audio is absent,
  show nothing about audio — no dead button, no "coming soon" (unless later
  requested).
- **Photos:** stored in Supabase Storage, grouped into event-based albums that
  members can browse and download.

---

## 6. Data model (Postgres tables, all with RLS)

- `profiles` — 1:1 with the auth user (name, photo, contact, membership_status);
  belongs to a household.
- `households` — family grouping; a profile references a household.
- Role field on profile (or `roles` table) — at least: `member`, `group_leader`,
  `admin`.
- `groups` — ministries and small groups.
- `group_members` — join table (profile, group, status: pending/approved,
  role_in_group).
- `events` — supports recurrence rules, capacity, location.
- `event_rsvps` — profile ↔ event, status, waitlist position.
- `volunteer_slots` + `volunteer_signups` — slots attached to an event.
- `media_items` — typed (video/audio/photo); fields: title, series, speaker,
  date, topic, `youtube_id` (nullable), `audio_file_path` (nullable, Supabase
  Storage), `audio_status` enum (`none` | `processing` | `ready`), `duration`
  (nullable), `is_live` (bool). **At least one of `youtube_id` /
  `audio_file_path` must be set.**
- `photo_albums` + `photos` — albums grouped by event.
- `announcements` — home-screen feed.
- `prayer_requests` — `visibility` enum (`public` | `group_only` | `private`)
  + `is_anonymous` flag.
- `notifications` + `notification_preferences` — per-category opt-out.
- `broadcasts` — segmented messages targeting a group/ministry.

---

## 7. Functional requirements (each is an acceptance criterion)

### Members
- Register via email or phone with verification; create/edit profile.
- Household linking groups related members.
- Role-based access (member / group_leader / admin) enforced via RLS.
- Searchable member directory with per-member privacy controls (opt in/out of
  visibility; choose which fields are shown).
- Lightweight onboarding flow for new/visiting members.

### Media
- Stream sermon/event videos on demand (YouTube embed).
- Live-stream services; auto-fallback to the archived YouTube video afterward.
- Self-hosted sermon audio with background playback and offline download.
- Searchable/filterable archive (series, speaker, date, topic).
- Event-based photo albums members can browse and download.

### Events
- Shared calendar of services, groups, and special events.
- RSVP/registration with confirmation.
- Clean handling of recurring events.
- Capacity limits with waitlists.
- Reminders via push and/or email.
- Volunteer sign-up slots tied to an event.

### Communication
- Push notifications for announcements, reminders, messages.
- Segmented broadcasts (target a group/ministry, not everyone).
- Home-screen announcements feed.
- Prayer request submission with public / group-only / private and anonymous
  options; a prayer wall that respects each setting.
- Per-member notification preferences and category opt-out.

### Groups
- Browse groups/ministries and request to join.
- Leaders manage rosters and approve join requests.
- Leaders message their group directly.
- Attendance tracking per meeting.
- Group-specific content/discussion (announcements minimum).

### Admin (minimum to run the app)
- Create a `media_item` with the YouTube id + metadata (title, series, speaker,
  date, topic) at/after the service.
- Later, upload the sermon MP3 to that existing item; on success set
  `audio_status = ready` and capture `duration`. Support replacing a wrong
  file. Audio must attach to an already-created sermon — no orphan uploads.
- Publish/manage events, announcements, photo albums.
- Assign roles and moderate content.
- Simple dashboard: member count, upcoming events, recent engagement.

---

## 8. Guardrails

- Ask before inventing product decisions (branding, exact fields, whether a
  feature is member- or admin-only) rather than guessing.
- Never put payments, card data, or finance logic in v1.
- Never scrape, download, or extract audio from YouTube.
- Enforce RLS on every table before a feature is considered done.
- Prefer fewer, well-built screens over many shallow ones. Keep the member
  experience clean and fast.

---

## 9. Build phases (do in order; finish and let me review each)

1. **Foundation** — Expo + expo-router + TS scaffold; Supabase project; auth;
   `profiles`; roles; RLS baseline; navigation shell; design system/theme.
   Confirm it runs on web + one mobile target before moving on.
2. **Members** — directory, households, privacy controls, onboarding.
3. **Media** — YouTube embed (on-demand + live + archive fallback); self-hosted
   audio player with background + offline; searchable archive; photo albums.
4. **Events** — calendar, RSVP, recurrence, capacity/waitlist, reminders,
   volunteer slots.
5. **Communication** — announcements feed, push, segmented broadcasts, prayer
   requests + wall, notification preferences.
6. **Groups** — browse/join, leader roster management, group messaging,
   attendance, group content.
7. **Admin** — media publishing (incl. the two-step video-then-audio flow),
   event/announcement/album management, moderation, dashboard.

At the start of each phase: restate the scope, ask any blocking questions, then
implement. Begin with Phase 1.
