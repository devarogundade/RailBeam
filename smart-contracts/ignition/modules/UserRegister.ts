// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const UserRegisterModule = buildModule("UserRegisterModule", (m) => {
  const userRegistry = m.contract("UserRegistry");

  return { userRegistry };
});

export default UserRegisterModule;
