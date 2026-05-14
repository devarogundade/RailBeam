import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const stardormApiContractRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../packages/stardorm-api-contract",
);
const beamSdkRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../packages/beam-sdk",
);

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // Monorepo file: dep can end up incomplete in node_modules; resolve from source tree.
        "@beam/stardorm-api-contract": stardormApiContractRoot,
        "@beam/beam-sdk": beamSdkRoot,
      },
    },
  },
});
