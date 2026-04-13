import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vueDevTools from "vite-plugin-vue-devtools";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), vueDevTools()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "beam-ts/src": path.resolve(
        fileURLToPath(new URL("../sdk/dist", import.meta.url)),
      ),
    },
  },
  preview: {
    port: 5174,
  },
  server: {
    port: 5174,
  },
});
