import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nm = path.join(root, "node_modules");
const primary = path.join(nm, "eslint", "bin", "eslint.js");
const fallback = path.join(nm, ".ignored", "eslint", "bin", "eslint.js");
const eslintBin = fs.existsSync(primary) ? primary : fallback;
if (!fs.existsSync(eslintBin)) {
  console.error(
    "ESLint is not installed. From the app folder, remove node_modules and run pnpm install.",
  );
  process.exit(1);
}
const ignoredRoot = path.join(nm, ".ignored");
if (fs.existsSync(ignoredRoot)) {
  const sep = path.delimiter;
  process.env.NODE_PATH = process.env.NODE_PATH
    ? `${ignoredRoot}${sep}${process.env.NODE_PATH}`
    : ignoredRoot;
}
const args = [eslintBin, ".", ...process.argv.slice(2)];
const r = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});
process.exit(r.status === null ? 1 : r.status);
