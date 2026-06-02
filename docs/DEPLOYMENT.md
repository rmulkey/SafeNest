# SafeNest Toys — Deployment Guide (Vercel + Neon + GitHub)

This app is production-build-verified (73 routes build cleanly). Follow these
steps to deploy free on Vercel with a free Neon Postgres database.

> Everything below uses your own accounts and browser logins. None of it stores
> secrets in the repo — all credentials live in Vercel's environment settings.

---

## 1. Create a GitHub repo and push

Install the GitHub CLI (one time):

```bash
brew install gh
gh auth login          # opens browser; pick GitHub.com → HTTPS → login
```

Create the repo from inside the project and push:

```bash
cd /Users/mulkeyr/SafetyNest
gh repo create safenest-toys --private --source=. --remote=origin --push
```

(Or manually: create an empty repo on github.com, then
`git remote add origin <url> && git push -u origin main`.)

The repo is safe to push — `.env` and `.env.local` are gitignored and verified
untracked.

---

## 2. Create a free Neon Postgres database

1. Go to https://neon.tech → sign up (free tier).
2. Create a project (e.g. "safenest-toys").
3. Copy the **pooled** connection string. It looks like:
   `postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require`
4. Keep this for the `DATABASE_URL` env var below.

Run the migration against Neon (creates the 5 tables):

```bash
cd /Users/mulkeyr/SafetyNest
DATABASE_URL="<your-neon-pooled-url>" npm run db:deploy
```

You should see "All migrations have been successfully applied."

---

## 3. Deploy to Vercel

Install the Vercel CLI (one time):

```bash
npm i -g vercel
vercel login          # opens browser
```

From the project root:

```bash
cd /Users/mulkeyr/SafetyNest
vercel link           # connect to a new Vercel project
vercel --prod         # first production deploy
```

Or skip the CLI: go to https://vercel.com → "Add New Project" → import the
GitHub repo. Vercel auto-detects Next.js. Every push to `main` then
auto-deploys, and PRs get preview URLs.

---

## 4. Set environment variables in Vercel

In the Vercel project → Settings → Environment Variables, add the following.
Mark them for Production (and Preview if you want previews to work).

### Required for the site to build & render content
| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `ofvgjgsi` | Public, safe to expose |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` | |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` | Used for canonical/OG/sitemap |
| `DATABASE_URL` | `<Neon pooled URL>` | Enables clicks, favorites, newsletter |
| `SANITY_API_TOKEN` | `<editor token>` | Only needed for webhook writes (score recalc). Omit if not using the Sanity webhook. |

### Affiliate
| Variable | Value |
|---|---|
| `AMAZON_AFFILIATE_TAG` | `safeneststore-20` |

### Optional services (the app degrades gracefully if these are absent)
| Variable | Service | Effect if missing |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk auth | Auth/favorites disabled; public site works |
| `CLERK_WEBHOOK_SECRET` | Clerk user-sync webhook | New users not mirrored to DB |
| `KLAVIYO_API_KEY` | Newsletter | Signups validate but don't sync to Klaviyo |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Google Analytics | No GA tracking |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | No product analytics |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel | No conversion pixel |
| `SANITY_WEBHOOK_SECRET` | Sanity → ISR revalidation | Manual redeploy needed for content updates |
| `CRON_SECRET` | Protects the daily cron route | Cron route unprotected |
| `ADMIN_WEBHOOK_URL` | Unhealthy-link alerts | Alerts log to console only |

---

## 5. Post-deploy wiring (optional)

- **Sanity webhook** → point your Sanity project's webhook at
  `https://<domain>/api/webhooks/sanity` so content edits trigger revalidation.
- **Clerk webhook** → point at `https://<domain>/api/webhooks/clerk` for user sync.
- **Cron** → `vercel.json` already schedules the daily link-health check at 06:00 UTC.
- **Custom domain** → add it in Vercel → Settings → Domains, then update
  `NEXT_PUBLIC_SITE_URL`.

---

## What works without any optional keys

Even with only the required vars (Sanity + DATABASE_URL), you get: the full
public site (75 reviewed products with real images), the Toy Finder, comparison
tables, best-of/category/age pages, blog, recalls, working Amazon affiliate
buy buttons with your tag, SEO (sitemap, robots, structured data), and click
tracking. Auth, newsletter sync, and analytics activate as you add their keys.
