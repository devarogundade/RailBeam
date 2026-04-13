// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import BeamModule from "./Beam";
import IdentityRegistryModule from "./IdentityRegistry";
import ReputationRegistryModule from "./ReputationRegistry";
import ValidationRegistryModule from "./ValidationRegistry";

const AllContractsModule = buildModule("AllContractsModule", (m) => {
  const { beam } = m.useModule(BeamModule);

  const { identityRegistry } = m.useModule(IdentityRegistryModule);
  const { reputationRegistry } = m.useModule(ReputationRegistryModule);
  const { validationRegistry } = m.useModule(ValidationRegistryModule);

  return {
    beam,
    identityRegistry,
    reputationRegistry,
    validationRegistry,
  };
});

export default AllContractsModule;
