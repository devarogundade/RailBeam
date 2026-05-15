/**
 * TanStack Start writes `.netlify/v1/functions` under `app/` (Vite cwd).
 * Netlify discovers `.netlify` at the repository root, so copy it after build
 * and fix the server entry import path for the monorepo layout.
 */
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "app", ".netlify");
const dest = join(root, ".netlify");

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });

const serverMjs = join(dest, "v1", "functions", "server.mjs");
const content = readFileSync(serverMjs, "utf8").replace(
  '"../../../dist/server/server.js"',
  '"../../../app/dist/server/server.js"',
);
writeFileSync(serverMjs, content);
