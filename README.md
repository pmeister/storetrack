# StoreTrack

Shopping lists organized by store — with each store's checklist grouped into
sections that match how you walk it — plus a shared home pantry. Built as a
PWA: runs in the browser and installs to an Android home screen.

- **Stores** — each store has its own list and its own sections ("Produce",
  "Aisle 2", …), drag-reorderable into walking order.
- **Shopping** — items are grouped by section; checked items sink into an
  "In cart" group where they can be unchecked one at a time or all at once
  for the next trip. Each item's ⋯ menu offers rename, move to section,
  add to pantry, and delete.
- **Pantry** — quantities and restock thresholds; low items can be pushed onto
  a store's list (it remembers each item's usual store and section), and list
  items can be added to the pantry from their ⋯ menu.
- **Household** — everyone who joins with your invite code shares the same
  stores, lists, and pantry, live via Supabase Realtime.

## Stack

Vite + React + TypeScript · Tailwind CSS v4 · TanStack Query v5 over
supabase-js · dnd-kit · vite-plugin-pwa. Data lives in Supabase (Postgres +
Auth + Realtime) with row-level security per household.

## Setup

1. **Create a Supabase project** (free tier) at [supabase.com](https://supabase.com).
2. **Run the schema**: paste all of [`supabase/schema.sql`](supabase/schema.sql)
   into the SQL Editor and run it. This file is the source of truth for
   tables, RLS policies, RPCs, and the signup trigger.
3. **Auth settings**: Authentication → Providers → Email — leave
   email/password enabled and turn **off** "Confirm email".
4. **Realtime**: Database → Publications → `supabase_realtime` — add
   `stores`, `sections`, `list_items`, `pantry_items`.
5. **Env vars**: copy `.env.example` to `.env.local` and fill in the Project
   URL and anon key from Project Settings → API.

```sh
npm install
npm run dev
```

## Deploying (needed for Android install)

The PWA install prompt requires HTTPS. Push this repo to GitHub, import it in
[Vercel](https://vercel.com) (zero config for Vite), and set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the project's environment
variables. Then install it on a phone:

- **Android**: open the URL in Chrome → menu (⋮) → **Add to Home screen** → Install.
- **iPhone**: open the URL in **Safari** (installing only works from Safari) →
  Share button → **Add to Home Screen**.

## Offline behavior

The app shell is precached, and the query cache is persisted to localStorage,
so lists stay readable with no signal. Check-offs made offline are replayed
when the connection returns, as long as the app stays open. There is no full
offline sync engine — by design.

One iOS caveat: Safari can evict site storage for web apps you haven't opened
in a while, so an installed StoreTrack that sat unused for weeks may need a
fresh sign-in and an online launch to repopulate its cache.
