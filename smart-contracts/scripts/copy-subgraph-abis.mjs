import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "subgraph", "abis");
const pairs = [
  [
    path.join(root, "artifacts", "contracts", "IdentityRegistry.sol", "IdentityRegistry.json"),
    path.join(outDir, "IdentityRegistry.json"),
  ],
  [
    path.join(root, "artifacts", "contracts", "ReputationRegistry.sol", "ReputationRegistry.json"),
    path.join(outDir, "ReputationRegistry.json"),
  ],
  [
    path.join(root, "artifacts", "contracts", "ValidationRegistry.sol", "ValidationRegistry.json"),
    path.join(outDir, "ValidationRegistry.json"),
  ],
];

fs.mkdirSync(outDir, { recursive: true });
for (const [src, dst] of pairs) {
  if (!fs.existsSync(src)) {
    console.error(`Missing artifact (run \`npx hardhat compile\` first): ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dst);
  console.log(`Copied ${path.basename(dst)}`);
}
