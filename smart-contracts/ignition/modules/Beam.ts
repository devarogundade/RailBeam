// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, stringToBytes, zeroAddress } from "viem";

import MerchantModule from "./Merchant";
import OneTimeTransactionModule from "./OneTimeTransaction";
import RecurrentTransactionModule from "./RecurrentTransaction";
import HookManagerModule from "./HookManager";
import ReceiptModule from "./Receipt";

const MINTER_ROLE = keccak256(stringToBytes("MINTER_ROLE"));

const BeamModule = buildModule("BeamModule", (m) => {
  const { merchant } = m.useModule(MerchantModule);
  const { receipt } = m.useModule(ReceiptModule);
  const { oneTimeTransaction } = m.useModule(OneTimeTransactionModule);
  const { recurrentTransaction } = m.useModule(RecurrentTransactionModule);
  const { hookManager } = m.useModule(HookManagerModule);

  const addressLib = m.library("AddressLib");
  const integerLib = m.library("IntegerLib");

  const beam = m.contract(
    "Beam",
    [merchant, oneTimeTransaction, recurrentTransaction, hookManager],
    {
      libraries: {
        AddressLib: addressLib,
        IntegerLib: integerLib,
      },
    },
  );

  m.call(hookManager, "transferOwnership", [beam]);
  m.call(oneTimeTransaction, "transferOwnership", [beam]);
  m.call(recurrentTransaction, "transferOwnership", [beam]);

  m.call(receipt, "grantRole", [MINTER_ROLE, oneTimeTransaction], {
    id: "oneTimeTransaction",
  });
  m.call(receipt, "grantRole", [MINTER_ROLE, recurrentTransaction], {
    id: "recurrentTransaction",
  });

  return { beam };
});

export default BeamModule;
