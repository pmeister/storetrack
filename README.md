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

Vite + React + TypeScript · Tailwind CSS v4 · TanStack Query v5 over
supabase-js · dnd-kit · vite-plugin-pwa. Data lives in Supabase (Postgres +
Auth + Realtime) with row-level security per household.

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

## Kafka change stream (optional)

Every insert/update/delete on `stores`, `sections`, and `list_items` is
streamed to a Confluent Cloud topic (`storetrack.changes`), keyed by
`table:row-id`:

    Supabase trigger (supabase/webhooks.sql)
      → POST /api/kafka-webhook on Vercel (secret-gated)
        → Confluent Kafka REST API produce

Setup: create the topic and a cluster API key in Confluent (granular access),
set `CONFLUENT_REST_ENDPOINT`, `CONFLUENT_CLUSTER_ID`, `CONFLUENT_API_KEY`,
`CONFLUENT_API_SECRET`, and `WEBHOOK_SECRET` in Vercel, then run
`supabase/webhooks.sql` (placeholders filled in) in the Supabase SQL Editor.

The **Activity** tab consumes the topic back:

    /api/audit-log (kafkajs, consumer group storetrack-audit)
      → drains new messages into the activity_events table
        → the app reads activity_events directly (RLS-scoped)

The consumer keeps committed offsets, so each drain only fetches what
arrived since the last one — when nothing is pending it returns without
opening a consumer at all. Because the screen renders from the table rather
than from a topic replay, it paints instantly and picks up new entries a
moment later. Replayed messages collide on a unique `(partition, offset)`
index and are ignored, so drains are idempotent.

Extra setup for the consumer:

- Run [`supabase/2026-07-29-activity-events.sql`](supabase/2026-07-29-activity-events.sql).
- Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel (server-side only — never
  `VITE_`-prefixed). One drain writes rows for every household in the topic,
  not just the caller's, and the table has no client-writable policy so the
  log can't be forged from the app.
- Give the API key's service account these ACLs:

| Resource | Name | Pattern | Operation |
|---|---|---|---|
| Topic | `storetrack.changes` | Literal | Write |
| Topic | `storetrack.changes` | Literal | Read |
| Consumer group | `storetrack-audit` | Literal | Read |

Events that have already been drained live in Postgres indefinitely, but
anything still only in Kafka is subject to the topic's retention (Confluent
default: 7 days) — so a gap longer than retention between drains loses
whatever expired in between. Set the topic's `retention.ms` to `-1` if that
matters.

## Offline behavior

The app shell is precached, and the query cache is persisted to localStorage,
so lists stay readable with no signal. Check-offs made offline are replayed
when the connection returns, as long as the app stays open. There is no full
offline sync engine — by design.

One iOS caveat: Safari can evict site storage for web apps you haven't opened
in a while, so an installed StoreTrack that sat unused for weeks may need a
fresh sign-in and an online launch to repopulate its cache.

## License

MIT — see [LICENSE](LICENSE). © 2026 Patrick Taylor.
