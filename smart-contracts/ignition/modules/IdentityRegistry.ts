import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("StardormIdentityRegistryModule", (m) => {
  const identityRegistry = m.contract("IdentityRegistry");
  return { identityRegistry };
});
