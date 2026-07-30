# StoreTrack

Shopping lists organized by store — with each store's checklist grouped into
sections that match how you walk it. Built as a PWA: runs in the browser and
installs to an Android or iPhone home screen.

Looking for the friendly, non-technical intro to share with someone? See
[ABOUT.md](ABOUT.md).

- **Stores** — each store has its own list and its own sections ("Produce",
  "Aisle 2", …), drag-reorderable into walking order.
- **Shopping** — items are grouped by section; checked items sink into a
  "Checked" group where they can be unchecked one at a time or all at once
  for the next trip. Duplicate names (case-insensitive) are prevented —
  re-adding a checked item moves it back onto the list. Each item's ⋯ menu
  offers rename, move to section, and delete.
- **Household** — everyone who joins with your invite code shares the same
  stores and lists, live via Supabase Realtime.

## Stack

**Frontend** — Vite + React + TypeScript, Tailwind CSS v4, React Router,
TanStack Query v5 over supabase-js (with a localStorage-persisted cache),
dnd-kit for drag reordering, and vite-plugin-pwa for the manifest and service
worker. No SSR: it's a pure client app.

**Data and auth** — Supabase (Postgres, Auth, Realtime). Every table is
protected by row-level security scoped to the caller's household. Sign-in is
OpenID Connect via Google, with email/password kept as a fallback.

**Hosting** — Vercel. It serves the static build and auto-deploys every push
to `main`. There is no server code at all; HTTPS there is what makes the PWA
installable.

**Activity log** — a database trigger records every change into an
`activity_events` table, which the Activity tab reads directly and Realtime
keeps current. See [Activity log](#activity-log) below.

## Setup

1. **Create a Supabase project** (free tier) at [supabase.com](https://supabase.com).
2. **Run the schema**: paste all of [`supabase/schema.sql`](supabase/schema.sql)
   into the SQL Editor and run it. This file is the source of truth for
   tables, RLS policies, RPCs, and the signup trigger.
3. **Auth settings**:
   - Authentication → Providers → **Email**: leave enabled (existing accounts
     and the fallback form use it) and turn **off** "Confirm email".
   - Authentication → Providers → **Google**: enable it and paste the OAuth
     client ID and secret from a Google Cloud project (see below).
   - Authentication → **URL Configuration**: set Site URL to the deployed
     origin and add both origins to Redirect URLs —
     `https://<your-app>.vercel.app/**` and `http://localhost:5173/**`.
4. **Realtime**: Database → Publications → `supabase_realtime` — add
   `stores`, `sections`, `list_items`.
5. **Env vars**: copy `.env.example` to `.env.local` and fill in the Project
   URL and anon key from Project Settings → API.

```sh
npm install
npm run dev
```

### Sign-in (OIDC)

Sign-in and account creation go through OpenID Connect — currently Google,
with email/password kept as a fallback for accounts that predate it. Signing
in with a provider for the first time creates the account and its profile
automatically (the `handle_new_user` trigger reads the name from
`display_name`, `full_name`, or `name`, whichever the provider sends).

To set up the Google credentials:

1. In [Google Cloud Console](https://console.cloud.google.com) → APIs &
   Services → **Credentials**, create an **OAuth client ID** of type *Web
   application*.
2. Under *Authorized redirect URIs*, add the callback Supabase shows on its
   Google provider page: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Configure the OAuth consent screen (External is fine; while it is in
   "Testing" only accounts listed as test users can sign in — publish it, or
   add household members as test users).
4. Paste the client ID and secret into Supabase → Authentication → Providers →
   Google.

Adding another provider (Apple, GitHub, an enterprise IdP…) means enabling it
in Supabase, appending an entry to `OIDC_PROVIDERS` in
[`src/lib/oidc.ts`](src/lib/oidc.ts), and adding its brand mark to the sign-in
screen. The redirect handling itself is provider-agnostic.

## Deploying (needed for Android install)

The PWA install prompt requires HTTPS. Push this repo to GitHub, import it in
[Vercel](https://vercel.com) (zero config for Vite), and set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the project's environment
variables. Then install it on a phone:

- **Android**: open the URL in Chrome → menu (⋮) → **Add to Home screen** → Install.
- **iPhone**: open the URL in **Safari** (installing only works from Safari) →
  Share button → **Add to Home Screen**.

## Activity log

Every insert, update, and delete on `stores`, `sections`, and `list_items`
fires the `log_activity` trigger, which appends a row to `activity_events`
capturing the operation, the table, and the whole row before and after as
JSON. The Activity tab reads that table directly (RLS-scoped to the
household) and Realtime pushes new rows to open devices.

The trigger runs *after* `set_updated_by`, so each captured row already
carries the acting user — that's how entries get attributed to a member's
nickname. Deletes are attributed to whoever last edited the row, since a
deleted row can't record who removed it.

`activity_events` is read-only to clients: it has a `select` policy and no
insert, update, or delete policy, so only the trigger writes to it and the
log can't be forged or edited from the app.

An earlier version of this streamed changes through Confluent Cloud (Kafka)
and consumed them back with kafkajs. That worked, but the trigger does the
same job with no external service, no extra credentials, and no delivery
delay. See the history of `api/` and `supabase/webhooks.sql` if you want the
Kafka version back.

## Offline behavior

The app shell is precached, and the query cache is persisted to localStorage,
so lists stay readable with no signal. Check-offs made offline are replayed
when the connection returns, as long as the app stays open. There is no full
offline sync engine — by design.

One iOS caveat: Safari can evict site storage for web apps you haven't opened
in a while, so an installed StoreTrack that sat unused for weeks may need a
fresh sign-in and an online launch to repopulate its cache.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
© 2026 Patrick Taylor.
