# 🥗 MealMate

A personal AI meal-planning and meal-prep assistant for UK kitchens. Go from
**what I have → what I should eat → what to buy → what it costs → how to prep → how to use leftovers.**

Live at **https://mealmate.rishabh.uk** — a static site on GitHub Pages, with
Google sign-in and per-account cloud storage on Supabase.

Built for the 2-person, vegetarian, high-protein, budget-conscious household —
but every one of those assumptions is configurable.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and hit **Try the demo** — it seeds a realistic
2-person vegetarian kitchen (£50/week, Indian + Western) and generates a full
example week instantly. No API key, no database, no sign-up.

To check the exact static build that GitHub Pages will serve:

```bash
npm run build && npm run start   # builds out/ and serves it on :3000
```

## What actually works (no mockups)

- **Onboarding** — household size, budget, diet, goals, protein/calorie targets,
  cuisines, cooking time, meal slots, equipment, ingredients you avoid.
- **Pantry** (`/ingredients`) — pantry/fridge/freezer sections, quantities,
  expiry dates, quick-add chips, custom items. A "Scan my fridge" placeholder is
  architecturally ready for a vision model (and honest that none is connected).
- **Generate My Week** — a deterministic local optimiser scores every candidate
  recipe per slot on protein fit, calorie fit, cost vs budget, ingredient reuse,
  expiring-food rescue, variety, cooking time and batch-friendliness.
- **Leftovers** — batch dinners cook double and appear as labelled leftover
  lunches ("Leftover from Monday dinner — zero extra cooking").
- **Why this meal?** — every planned meal carries generated reasons ("Uses your
  spinach before it expires", "Shares 5 ingredients with other meals this week").
- **Swap / Move / Remove** — swap shows 3 alternatives matched on calories,
  protein, cost and time; a swapped dinner keeps its leftover lunch coherent.
- **Groceries** — consolidated across the week, grouped by aisle, **pantry stock
  deducted**, pack-rounded UK price estimates per supermarket, purchase ticks,
  quantity steppers, custom items. Wraps to two lines on phones.
- **Make it cheaper** — when the basket exceeds budget, the optimiser proposes
  meal swaps that hold protein/calories steady and shows £before → £after.
- **Meal Prep** — the week's components grouped into one batch session, mapped
  to the meals they feed, on a timeline that overlaps active work with simmering.
- **Cooking Mode** — one step at a time, with timers auto-detected from steps.
- **Use It Up** / **I don't want to cook** / **Start Next Week**.

## Where your kitchen is saved

- **Guest mode (no configuration):** the whole state lives in the browser's
  `localStorage`. Works with zero setup.
- **Signed in:** each Google account's kitchen is one JSON document in a
  Supabase Postgres table, protected by Row Level Security, so it follows you to
  any device. The first time you sign in on a device that already has a guest
  kitchen, that kitchen is adopted into your account (only if the account is
  empty). **Signing out wipes the kitchen from the device.** If the cloud can't
  be read, the app refuses to save, so an empty screen never overwrites real data.

## Architecture

```
src/
  data/          ingredients.ts (UK pricing catalogue) · recipes/ (58 recipes) · demo.ts
  lib/
    types.ts     domain model
    schemas.ts   zod contracts — every planner backend must emit these shapes
    engine/      planner · grocery · budget · swap · prep · useitup · cost
    services/    MealPlannerService abstraction (local engine today, AI later)
    auth.tsx     Supabase Auth (Google) wrapper
    persistence.ts  StateStore: localStorage + Supabase implementations
    store.tsx    app state; picks a store by who's signed in, debounced cloud saves
    supabase/    browser client + config (no server — this is a static site)
  components/    ui.tsx (design system) · app-shell · account · meal-visual
  app/           / · /onboarding · /dashboard · /meal-plan(/[id]) · /recipes(/[id])
                 /groceries · /ingredients · /meal-prep · /settings · /auth/callback
supabase/migrations/0001_user_state.sql   the one table + its RLS policies
.github/workflows/deploy.yml              build the static export, publish to Pages
```

**Static by design.** `next.config.ts` sets `output: "export"`, so `npm run
build` produces a plain `out/` folder with no Node server. Every recipe and day
page is prerendered. Google's OAuth code is exchanged **in the browser** on
`/auth/callback/` (supabase-js `detectSessionInUrl`), and the session lives in
`localStorage`. Security doesn't depend on the web server at all: it's enforced
by Supabase's Row Level Security against the signed-in user's token.

**Recipes:** 58 egg-free, mushroom-free recipes that never need frying — rotis
cook on a dry tawa, crisping is done in an air fryer or oven, and everything
else is a hob simmer, a microwave, or no cooking. Each recipe declares the kit
it needs (`equipment` = all required, `equipmentAnyOf` = any one of), and users
can list ingredients they avoid; those recipes are never planned or suggested.

**Theming:** a warm dark theme. Every colour is a role token in
`src/app/globals.css`, so re-skinning is a one-file change.

**Connecting a real AI provider:** implement `MealPlannerService`
(`src/lib/services/meal-planner-service.ts`) with a model call that returns
structured JSON, validate it with the zod schemas in `src/lib/schemas.ts`, and
return it from `getMealPlannerService()`. The UI never touches free-form text.

**Pricing:** `src/data/ingredients.ts` is a demo dataset of estimated prices —
clearly labelled as estimates in the UI. A live grocery API can replace the
`packPrice` lookup without touching the engine.

## Deployment: GitHub Pages + Cloudflare

The workflow in `.github/workflows/deploy.yml` builds the static export and
publishes `out/` on every push to `main`.

1. **GitHub → repo Settings → Pages:** set *Source* to **GitHub Actions**.
2. **Supabase credentials** are committed in the workflow. A publishable key
   ships inside the browser bundle by design, so hiding it from the repo would
   buy nothing — Row Level Security is the real boundary. To point a build at a
   different project, add repo variables `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`; they override the committed defaults.
   The `service_role` / `sb_secret_` key bypasses RLS and must never be added.

### Where the site is mounted

GitHub serves a project repo under `r1shabh-arora.github.io/mealmate/`, but a
custom domain serves the same files from the root. A static export bakes that
prefix into every asset URL, so **the build has to know which one it is** — get
it wrong and the HTML loads while every stylesheet and script 404s.

`NEXT_PUBLIC_BASE_PATH` is that switch. The custom domain is configured, so the
workflow builds for the domain root. Should the custom domain ever be removed,
Pages reverts to the project URL: add a repo variable `SITE_BASE_PATH` set to
`/mealmate` and re-run the workflow.

### Custom domain

Already set up, recorded here so it can be rebuilt:

1. **Cloudflare DNS for rishabh.uk:** a `CNAME` record, name `mealmate`, target
   `r1shabh-arora.github.io`, proxy status **DNS only** (grey cloud) so GitHub
   can issue the certificate.
2. **Repo Settings → Pages → Custom domain:** `mealmate.rishabh.uk`, with
   *Enforce HTTPS* ticked once the certificate is issued. On the Actions deploy
   path this setting — not a `CNAME` file in the repo — is what configures the
   domain.

## Accounts & cloud sync (Supabase + Google)

Optional — skip it and the site stays in guest mode. About 15 minutes.

1. **Create a Supabase project** at https://supabase.com (free tier; London
   region for UK users). From *Project Settings → API* copy the *Project URL*
   and *anon public* key. For local development put them in `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```

   For the live site add the same two values as GitHub Actions **Variables**
   (step 2 above) — they are inlined at build time.

2. **Create the table.** In the Supabase dashboard open *SQL → New query*, paste
   [`supabase/migrations/0001_user_state.sql`](supabase/migrations/0001_user_state.sql)
   and run it. It creates `user_state` (one row per user) with Row Level
   Security policies so a user can only ever read or write their own row.

3. **Set up Google sign-in.**
   - In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
     create an *OAuth client ID* of type *Web application*. Add this authorised
     redirect URI (Supabase's, not your site's):
     `https://<project-ref>.supabase.co/auth/v1/callback`
   - In Supabase go to *Authentication → Providers → Google*, enable it and
     paste the client ID and secret.
   - In *Authentication → URL Configuration* set *Site URL* to
     `https://mealmate.rishabh.uk` and add these *Redirect URLs* (trailing
     slashes matter — the site uses directory-style URLs):
     `https://mealmate.rishabh.uk/auth/callback/` and
     `http://localhost:3000/auth/callback/`.

4. A *Continue with Google* button appears on the landing page.

## Scripts

```bash
npm run dev     # dev server
npm run build   # static export to out/ (lint + typecheck included)
npm run start   # serve out/ locally, as GitHub Pages would
npm run lint    # eslint
```
