// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { zeroAddress } from "viem";

const MultiSigWalletModule = buildModule("MultiSigWalletModule", (m) => {
  const merchant = m.getParameter("merchant_", m.getAccount(0));
  const tokens = m.getParameter("tokens_", [zeroAddress]);
  const signers = m.getParameter("signers_", [m.getAccount(0)]);
  const minSigners = m.getParameter("minSigners_", 1n);

  const multiSigWallet = m.contract("MultiSigWallet", [
    merchant,
    tokens,
    signers,
    minSigners,
  ]);

  return { multiSigWallet };
});

export default MultiSigWalletModule;
