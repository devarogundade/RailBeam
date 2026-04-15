// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { zeroAddress } from "viem";

const USDCe = "0x1f3aa82227281ca364bfb3d253b0f1af1da6473e";
const wrapped0G = "0x1cd0690ff9a693f5ef2dd976660a8dafc81a109c";
const PAI = "0x59ef6f3943bbdfe2fb19565037ac85071223e94c";

const MultiSigWalletModule = buildModule("MultiSigWalletModule", (m) => {
  const merchant = m.getParameter("merchant_", m.getAccount(0));
  const tokens = m.getParameter("tokens_", [
    zeroAddress,
    USDCe,
    wrapped0G,
    PAI,
  ]);
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
