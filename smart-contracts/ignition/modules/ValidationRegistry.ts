import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import IdentityRegistryModule from "./IdentityRegistry";

export default buildModule("StardormValidationRegistryModule", (m) => {
  const { identityRegistry } = m.useModule(IdentityRegistryModule);
  const validationRegistry = m.contract("ValidationRegistry");
  m.call(validationRegistry, "initialize", [identityRegistry]);
  return { validationRegistry };
});
