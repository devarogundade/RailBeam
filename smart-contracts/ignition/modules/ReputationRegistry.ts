// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import IdentityRegistryModule from "./IdentityRegistry";

const ReputationRegistryModule = buildModule("ReputationRegistryModule", (m) => {
  const { identityRegistry } = m.useModule(IdentityRegistryModule);

  const reputationRegistry = m.contract("ReputationRegistry");

  m.call(reputationRegistry, "initialize", [identityRegistry]);

  return { reputationRegistry };
});

export default ReputationRegistryModule;

