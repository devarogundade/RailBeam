import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import IdentityRegistryModule from "./IdentityRegistry";

export default buildModule("StardormReputationRegistryModule", (m) => {
  const { identityRegistry } = m.useModule(IdentityRegistryModule);
  const reputationRegistry = m.contract("ReputationRegistry");
  m.call(reputationRegistry, "initialize", [identityRegistry]);
  return { reputationRegistry };
});
