#!/usr/bin/env node
/**
 * create-site — scaffold a new affiliate-engine app.
 *
 * Generates `apps/<slug>/` from the templates in `./templates/`: a valid
 * `SiteConfig` stub, theme tokens, the app shell, all route shells, and the
 * Sanity port-implementation wiring. The generated app consumes the engine
 * packages (`@core` / `@ui` / `@sanity-schema`) and builds with NO edits to any
 * engine package (Req 10.1, 10.2).
 *
 * Usage (from the repo root):
 *   npm run create-site -- --name "LearningNest"
 *   node tooling/create-site --name learningnest --noun-singular "learning tool" \
 *        --noun-plural "learning tools" --short-name LearningNest
 *
 * Flags:
 *   --name <name>            (required) Brand / site name. Slug is derived from it.
 *   --slug <slug>            Override the apps/<slug> directory + package name.
 *   --site-id <id>           Override the SiteConfig siteId (default: slug).
 *   --short-name <name>      Override the short brand name (default: first word).
 *   --noun-singular <noun>   Product noun, singular (default: "product").
 *   --noun-plural <noun>     Product noun, plural (default: "products").
 *                            NOTE: the plural noun is baked into the
 *                            `best-<noun>` route directory and must match the
 *                            SiteConfig's product.nounPlural.
 *   --review-type <name>     Sanity review document type (default: "<noun>Review").
 *   --domain <domain>        Placeholder brand domain (default: "<slug>.example.com").
 *   --force                  Overwrite the target directory if it already exists.
 *   --help                   Print this help.
 *
 * The scaffolder NEVER fabricates real-world data (products, ASINs, affiliate
 * links, images): the generated SiteConfig stub uses clearly-marked TODO
 * placeholders the operator fills in.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTokens } from "./lib/tokens.mjs";
import { renderTemplates } from "./lib/scaffold.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(HERE, "templates");
// tooling/create-site → repo root is two levels up.
const REPO_ROOT = path.resolve(HERE, "..", "..");
const APPS_DIR = path.join(REPO_ROOT, "apps");

const HELP = `create-site — scaffold a new affiliate-engine app

Usage:
  npm run create-site -- --name "LearningNest"
  node tooling/create-site --name learningnest --noun-singular "learning tool" --noun-plural "learning tools"

Flags:
  --name <name>           (required) Brand / site name; slug derived from it.
  --slug <slug>           Override apps/<slug> directory + package name.
  --site-id <id>          Override SiteConfig siteId (default: slug).
  --short-name <name>     Override short brand name (default: first word of name).
  --noun-singular <noun>  Product noun, singular (default: "product").
  --noun-plural <noun>    Product noun, plural (default: "products").
  --review-type <name>    Sanity review document type (default: "<noun>Review").
  --domain <domain>       Placeholder brand domain (default: "<slug>.example.com").
  --force                 Overwrite the target directory if it already exists.
  --help                  Print this help.
`;

/** Minimal `--flag value` / `--flag=value` / `--bool` parser. */
function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    let key;
    let value;
    if (eq !== -1) {
      key = arg.slice(2, eq);
      value = arg.slice(eq + 1);
    } else {
      key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        value = next;
        i++;
      } else {
        value = true; // boolean flag
      }
    }
    opts[key] = value;
  }
  return opts;
}

/** Map kebab CLI flags to the camelCase option keys buildTokens expects. */
function toOptions(args) {
  return {
    name: args.name,
    slug: args.slug,
    siteId: args["site-id"],
    shortName: args["short-name"],
    displayName: args["display-name"],
    nounSingular: args["noun-singular"],
    nounPlural: args["noun-plural"],
    reviewTypeName: args["review-type"],
    domain: args.domain,
  };
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    process.stdout.write(HELP);
    return;
  }

  if (!args.name || args.name === true) {
    process.stderr.write("Error: --name is required.\n\n" + HELP);
    process.exitCode = 1;
    return;
  }

  let tokens;
  try {
    tokens = buildTokens(toOptions(args));
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  const slug = tokens.__SITE_SLUG__;
  const destRoot = path.join(APPS_DIR, slug);

  if (await pathExists(destRoot)) {
    if (!args.force) {
      process.stderr.write(
        `Error: ${path.relative(REPO_ROOT, destRoot)} already exists. ` +
          `Re-run with --force to overwrite.\n`,
      );
      process.exitCode = 1;
      return;
    }
    await fs.rm(destRoot, { recursive: true, force: true });
  }

  process.stdout.write(`Scaffolding apps/${slug} …\n`);
  const written = await renderTemplates(TEMPLATES_DIR, destRoot, tokens);

  process.stdout.write(
    `\nCreated apps/${slug} with ${written.length} files:\n` +
      written.map((f) => `  apps/${slug}/${f}`).join("\n") +
      "\n",
  );

  process.stdout.write(
    [
      "",
      "Next steps:",
      "  1. npm install        # link the new workspace",
      `  2. Edit apps/${slug}/src/site.config.ts — replace every TODO placeholder`,
      "     (brand, scoring axes, segmentation buckets, taxonomy, copy, gift guides).",
      `  3. npm run type-check -- --filter=${slug}`,
      `  4. npm run build -- --filter=${slug}`,
      "  5. Provision the Sanity dataset, Vercel project, domain, and env vars",
      "     (see tooling/create-site/README.md and the new app's README).",
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  process.stderr.write(`create-site failed: ${err?.stack || err}\n`);
  process.exitCode = 1;
});
