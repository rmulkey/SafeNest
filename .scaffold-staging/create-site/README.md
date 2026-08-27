# @affiliate-engine/create-site

Scaffolds a new `apps/<slug>/` site that builds against the engine (`@core`,
`@ui`, `@sanity-schema`) with **no edits to any engine package** (Requirements
10.1, 10.2).

## Usage

From the repo root:

```bash
# via the root npm script
npm run create-site -- --name "LearningNest"

# or directly
node tooling/create-site --name learningnest \
  --noun-singular "learning tool" --noun-plural "learning tools" \
  --short-name LearningNest
```

### Flags

| Flag | Default | Notes |
| --- | --- | --- |
| `--name <name>` | _(required)_ | Brand / site name. The slug is derived from it. |
| `--slug <slug>` | kebab-case of `--name` | `apps/<slug>` directory + package name. |
| `--site-id <id>` | slug | `SiteConfig.siteId` (scopes shared-DB rows). |
| `--short-name <name>` | first word of name | Short brand name. |
| `--noun-singular <noun>` | `product` | Product noun, singular. |
| `--noun-plural <noun>` | `products` | Product noun, plural — **baked into the `best-<noun>` route directory**, so it must match `SiteConfig.product.nounPlural`. |
| `--review-type <name>` | `<noun>Review` | Sanity review document type name. |
| `--domain <domain>` | `<slug>.example.com` | Placeholder brand domain. |
| `--force` | – | Overwrite an existing `apps/<slug>`. |
| `--help` | – | Print help. |

## How it works

- **Templating**: token substitution over the files in `templates/`. Tokens use
  a `__TOKEN__` delimiter (e.g. `__SITE_NAME__`, `__SITE_ID__`,
  `__PRODUCT_NOUN_PLURAL__`) so substitution never collides with JSX object
  literals (`style={{ … }}`) in the template `.tsx` files. Tokens are replaced
  in both file **contents** and **path segments** (so the `best-__PRODUCT_NOUN_PLURAL__`
  directory renders to `best-<noun>`).
- **`.tmpl` suffix**: every template file ends in `.tmpl`, which keeps the
  un-rendered templates out of the monorepo's `tsc` / `eslint` / `prettier`
  globs. The suffix is stripped on render.
- **Only structural identifiers are tokenized.** Everything else niche-specific
  (brand colors, axes, segmentation buckets, taxonomy, copy, gift guides) is left
  in `src/site.config.ts` as a clearly-marked `TODO` placeholder for the operator
  to fill in. The scaffolder never fabricates real-world data (no fake products,
  ASINs, affiliate links, or images — see the project's data-integrity rules).

## What gets generated

```
apps/<slug>/
├── package.json            deps on @affiliate-engine/{core,ui,sanity-schema}
├── next.config.ts          transpilePackages for the engine, image/security config
├── tsconfig.json           extends the base config + @core/@ui/@sanity-schema/@ aliases
├── postcss.config.mjs
├── eslint.config.mjs
├── vitest.config.ts        runs the generated config smoke test
├── vercel.json             cron schedules
├── .env.example
├── .gitignore
├── README.md
├── public/                 placeholder logo.svg + manifest.json
└── src/
    ├── site.config.ts      VALID SiteConfig STUB (TODO placeholders)
    ├── site.config.test.ts smoke test (config validates, computeAllAxes works)
    ├── app/                layout + providers + globals.css + all route shells
    └── lib/                sanity/* port wiring, seo/structured-data, og, finder,
                            notifications
```

## After scaffolding

1. `npm install` to link the new workspace.
2. Replace every `TODO` in `src/site.config.ts`.
3. `npm run type-check -- --filter=<slug>` and `npm run build -- --filter=<slug>`.
4. Provision the runtime resources (see the generated app's `README.md`):
   a Sanity dataset, the `siteId`, a Vercel project, the domain, and env vars.
