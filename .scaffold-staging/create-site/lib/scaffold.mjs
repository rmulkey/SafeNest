/**
 * Template-tree walker for the create-site scaffolder.
 *
 * Recursively copies `templates/` into the target `apps/<slug>/`, applying token
 * substitution to BOTH file contents and path segments, and stripping the
 * trailing `.tmpl` from each filename. The `.tmpl` extension keeps template
 * files (which contain `__TOKENS__` and are not valid TS until rendered) out of
 * the monorepo's tsc / eslint / prettier globs.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { applyTokens } from "./tokens.mjs";

/** Recursively collect every file under `dir` (returns absolute paths). */
async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

/**
 * Render the template tree into `destRoot`.
 *
 * @param {string} templatesDir - Absolute path to the `templates/` directory.
 * @param {string} destRoot - Absolute path to the new `apps/<slug>` directory.
 * @param {Record<string,string>} tokens - Token → value map.
 * @returns {Promise<string[]>} Relative paths of the files written.
 */
export async function renderTemplates(templatesDir, destRoot, tokens) {
  const templateFiles = await collectFiles(templatesDir);
  const written = [];

  for (const srcFile of templateFiles) {
    const relFromTemplates = path.relative(templatesDir, srcFile);
    // Substitute tokens in the path, then strip the `.tmpl` rendering suffix.
    const renderedRel = applyTokens(relFromTemplates, tokens).replace(/\.tmpl$/, "");
    const destFile = path.join(destRoot, renderedRel);

    const raw = await fs.readFile(srcFile, "utf8");
    const rendered = applyTokens(raw, tokens);

    await fs.mkdir(path.dirname(destFile), { recursive: true });
    await fs.writeFile(destFile, rendered, "utf8");
    written.push(renderedRel);
  }

  written.sort();
  return written;
}
