// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ReceiptModule = buildModule("ReceiptModule", (m) => {
  const baseURI = m.getParameter("baseURI_", "");

  const receipt = m.contract("Receipt", [baseURI]);

  return { receipt };
});

export default ReceiptModule;
