// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const HookManagerModule = buildModule("HookManagerModule", (m) => {
  const addressLib = m.library("AddressLib");

  const hookManager = m.contract("HookManager", [], {
    libraries: {
      AddressLib: addressLib,
    },
  });

  return { hookManager };
});

export default HookManagerModule;
