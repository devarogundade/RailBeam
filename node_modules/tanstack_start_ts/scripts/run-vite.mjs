import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nm = path.join(root, "node_modules");
const ignoredRoot = path.join(nm, ".ignored");
if (fs.existsSync(ignoredRoot)) {
  const sep = path.delimiter;
  process.env.NODE_PATH = process.env.NODE_PATH
    ? `${ignoredRoot}${sep}${process.env.NODE_PATH}`
    : ignoredRoot;
}
const primary = path.join(nm, "vite", "bin", "vite.js");
const fallback = path.join(ignoredRoot, "vite", "bin", "vite.js");
const viteBin = fs.existsSync(primary) ? primary : fallback;
if (!fs.existsSync(viteBin)) {
  console.error(
    "Vite is not installed. From the app folder, remove node_modules and run pnpm install.",
  );
  process.exit(1);
}
const args = [viteBin, ...process.argv.slice(2)];
const r = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});
process.exit(r.status === null ? 1 : r.status);
