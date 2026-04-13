import path from "node:path";
import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vueDevTools from "vite-plugin-vue-devtools";

const nodeFs = path.resolve(
  fileURLToPath(new URL("./src/shims/nodeFs.ts", import.meta.url)),
);
const nodeFsPromises = path.resolve(
  fileURLToPath(new URL("./src/shims/nodeFsPromises.ts", import.meta.url)),
);

// https://vite.dev/config/
export default defineConfig({
  define: {
    global: "globalThis",
    "process.env": {},
  },
  plugins: [vue(), vueJsx(), vueDevTools()],
  resolve: {
    dedupe: ["axios", "ethers", "viem"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "beam-ts/src": path.resolve(
        fileURLToPath(new URL("../sdk/dist", import.meta.url)),
      ),
      fs: nodeFs,
      "node:fs/promises": nodeFsPromises,
      path: "path-browserify",
      "node:path": "path-browserify",
      crypto: "crypto-browserify",
      "node:crypto": "crypto-browserify",
      stream: "stream-browserify",
      buffer: "buffer",
      process: "process/browser",
      vm: "vm-browserify",
    },
  },
  optimizeDeps: {
    include: [
      "buffer",
      "process",
      "crypto-browserify",
      "stream-browserify",
      "path-browserify",
      "vm-browserify",
    ],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
