# Search Console data

This directory is gitignored except this file — the exports are first-party
traffic data and should not be committed.

## Why this is the missing piece

Every CTR statement in `seo/` is currently a hypothesis rather than an
observation, because there is no impressions or click data anywhere in the repo.
`seo/ctr-test-plan.md` is marked BLOCKED for exactly this reason. Once this
directory has data:

- The CTR test in `seo/ctr-test-plan.md` becomes runnable.
- The brief's "quick CTR wins" class, empty in `seo/keyword-map.csv`, can be
  populated for the first time.
- Semrush's modelled figures throughout `seo/` can be checked against reality.
  Where they disagree, **first-party data wins**.

## Two ways to get it

### Automated, and repeatable — recommended

`scripts/pull-search-console.mjs` pulls queries, pages, query+page, dates,
devices and countries over the full 16-month retention window, paginated, with no
new npm dependencies. It needs a service account with read access to the property.

Setup, once, about five minutes:

1. [Google Cloud console](https://console.cloud.google.com/) — create or pick a
   project.
2. Enable the **Google Search Console API** for that project.
3. **IAM → Service Accounts → Create**. No project roles are needed; its access
   comes from Search Console rather than from IAM.
4. On the new service account: **Keys → Add key → JSON**. Download it.
5. **Search Console → Settings → Users and permissions → Add user.** Paste the
   service account's email, the one ending `…iam.gserviceaccount.com`.
   **Restricted** is enough — the puller only reads.
6. Save the JSON here (it is gitignored) and point the env var at it:

   ```
   echo 'GSC_SERVICE_ACCOUNT_KEY=./gsc/service-account.json' >> .env.local
   ```

Then:

```
set -a; . ./.env.local; set +a
node scripts/pull-search-console.mjs
```

### Manual, if you would rather not set up a service account

[Search Console](https://search.google.com/search-console) → select the
`safenesttoys.com` property → **Performance** → set the date range to **16
months** (the default 3 months truncates the baseline) → **Export** ▸ **Download
CSV**. Unzip into this directory.

The zip contains `Queries.csv`, `Pages.csv`, `Countries.csv`, `Devices.csv`,
`Dates.csv` and `Search appearance.csv`. Filenames do not need to match what the
puller would produce.

## What cannot work, and why

Driving your signed-in Chrome to do the export automatically. Since Chrome 136,
remote debugging is refused when the default user-data-dir is in use, and that
restriction covers the `--remote-debugging-pipe` transport Playwright uses, not
just `--remote-debugging-port`. Verified on Chrome 151: Chrome launches and the
handshake never completes, timing out identically at 180 and 600 seconds.

Three scripts that attempted it were removed rather than left in place looking
usable.

## The number worth reading first

**Indexing → Pages**: how many of the 221 sitemap URLs are indexed, versus
"Discovered – currently not indexed" and "Crawled – currently not indexed". That
single breakdown decides whether the remaining problem is discovery, crawl budget
or quality — and no API in use here exposes it.
