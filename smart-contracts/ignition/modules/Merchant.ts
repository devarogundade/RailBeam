// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MerchantModule = buildModule("MerchantModule", (m) => {
  const hashLib = m.library("HashLib");

  const merchant = m.contract("Merchant", [], {
    libraries: {
      HashLib: hashLib,
    },
  });

  return { merchant };
});

export default MerchantModule;
