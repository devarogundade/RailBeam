// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const IdentityRegistryModule = buildModule("IdentityRegistryModule", (m) => {
  const identityRegistry = m.contract("IdentityRegistry");

  return { identityRegistry };
});

export default IdentityRegistryModule;

