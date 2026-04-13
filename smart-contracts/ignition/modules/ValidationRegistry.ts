// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import IdentityRegistryModule from "./IdentityRegistry";

const ValidationRegistryModule = buildModule("ValidationRegistryModule", (m) => {
  const { identityRegistry } = m.useModule(IdentityRegistryModule);

  const validationRegistry = m.contract("ValidationRegistry");

  m.call(validationRegistry, "initialize", [identityRegistry]);

  return { validationRegistry };
});

export default ValidationRegistryModule;

