const fs = require("node:fs");
const path = require("node:path");

/**
 * Prefer a normal install; fall back to pnpm's `node_modules/.ignored` layout
 * when multiple lockfiles / package managers left deps there.
 */
function requirePackage(name) {
  const candidates = [
    path.join(__dirname, "node_modules", name),
    path.join(__dirname, "node_modules", ".ignored", name),
  ];
  for (const dir of candidates) {
    const manifest = path.join(dir, "package.json");
    if (!fs.existsSync(manifest)) continue;
    const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
    const exp = pkg.exports?.["."];
    const fromExports =
      typeof exp === "string"
        ? exp
        : typeof exp?.default === "string"
          ? exp.default
          : typeof exp?.require === "string"
            ? exp.require
            : typeof exp?.import === "string"
              ? exp.import
              : undefined;
    const rel = fromExports ?? pkg.main ?? "index.js";
    return require(path.join(dir, rel));
  }
  throw new Error(
    `Could not resolve "${name}" under node_modules or node_modules/.ignored`,
  );
}

const eslint = requirePackage("@eslint/js");
const tseslint = requirePackage("typescript-eslint");
const reactHooks = requirePackage("eslint-plugin-react-hooks");
const reactRefresh = requirePackage("eslint-plugin-react-refresh");
const globals = requirePackage("globals");
const eslintConfigPrettier = requirePackage("eslint-config-prettier");

module.exports = tseslint.config(
  {
    ignores: [
      "dist/**",
      ".output/**",
      ".tanstack/**",
      "src/routeTree.gen.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["vite.config.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["eslint.config.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    files: [
      "src/components/ui/**",
      "src/lib/app-state.tsx",
      "src/lib/beam-network-context.tsx",
    ],
    rules: { "react-refresh/only-export-components": "off" },
  },
);
