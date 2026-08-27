import rootConfig from "../../eslint.config.mjs";

/**
 * ESLint config for the `create-site` tool.
 *
 * Extends the monorepo root flat config and declares Node.js globals for the
 * CLI's `.mjs` source. The root config targets the engine's TS/TSX and does not
 * enable Node globals, so `process`, `console`, etc. would otherwise trip
 * `no-undef` in this command-line tool. The `templates/` tree is ignored — those
 * files contain un-rendered `__TOKENS__` and are not valid source until the
 * scaffolder renders them into an app.
 */
export default [
  ...rootConfig,
  {
    ignores: ["templates/**"],
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
  },
];
