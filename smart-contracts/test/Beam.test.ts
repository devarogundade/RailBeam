import hre from "hardhat";
import { expect } from "chai";
import { getAddress, parseEther, zeroAddress } from "viem";

describe("Beam", function () {
  async function deployFixture() {
    const [deployer, merchantOwner, payer] = await hre.viem.getWalletClients();

    // Libraries
    const hashLib = await hre.viem.deployContract("HashLib");
    const boolLib = await hre.viem.deployContract("BoolLib");
    const addressLib = await hre.viem.deployContract("AddressLib");
    const integerLib = await hre.viem.deployContract("IntegerLib");

    // Core contracts
    const receipt = await hre.viem.deployContract("Receipt", ["https://base/"]);
    const MINTER_ROLE = await receipt.read.MINTER_ROLE();

    const merchant = await hre.viem.deployContract("Merchant", [], {
      libraries: { HashLib: hashLib.address },
    });

    const hookManager = await hre.viem.deployContract("HookManager", [], {
      libraries: { AddressLib: addressLib.address },
    });

    const oneTime = await hre.viem.deployContract("OneTimeTransaction", [receipt.address], {
      libraries: { HashLib: hashLib.address, BoolLib: boolLib.address },
    });
    const recurrent = await hre.viem.deployContract(
      "RecurrentTransaction",
      [receipt.address, merchant.address],
      { libraries: { HashLib: hashLib.address } }
    );

    const beam = await hre.viem.deployContract(
      "Beam",
      [merchant.address, oneTime.address, recurrent.address, hookManager.address],
      { libraries: { AddressLib: addressLib.address, IntegerLib: integerLib.address } }
    );

    // Beam must own tx contracts + hook manager
    await oneTime.write.transferOwnership([beam.address]);
    await recurrent.write.transferOwnership([beam.address]);
    await hookManager.write.transferOwnership([beam.address]);

    // allow receipts minted from tx contracts (called by tx contracts, not Beam)
    await receipt.write.grantRole([MINTER_ROLE, oneTime.address]);
    await receipt.write.grantRole([MINTER_ROLE, recurrent.address]);

    // Create merchant + wallet (accept ETH + token later)
    const merchantAsOwner = await hre.viem.getContractAt("Merchant", merchant.address, {
      client: { wallet: merchantOwner },
    } as any);

    await merchantAsOwner.write.create(
      [
        {
          metadata: { schemaVersion: 1, value: "m" },
          tokens: [zeroAddress],
          signers: [getAddress(merchantOwner.account.address)],
          minSigners: 1n,
        },
      ],
      { value: 0n }
    );

    const walletAddr = await merchant.read.getWallet([
      getAddress(merchantOwner.account.address),
    ]);

    return { beam, merchantOwner, payer, walletAddr };
  }

  it("routes ETH one-time transactions into merchant MultiSigWallet", async function () {
    const { beam, merchantOwner, payer, walletAddr } = await deployFixture();

    const beamPayer = await hre.viem.getContractAt("Beam", beam.address, {
      client: { wallet: payer },
    } as any);

    const amount = parseEther("0.25");

    const publicClient = await hre.viem.getPublicClient();
    const beforeWalletBal = await publicClient.getBalance({ address: walletAddr });

    const txHash = await beamPayer.write.oneTimeTransaction(
      [
        {
          payers: [getAddress(payer.account.address)],
          merchant: getAddress(merchantOwner.account.address),
          amounts: [amount],
          token: zeroAddress,
          description: "d",
          metadata: { schemaVersion: 1, value: "m" },
        },
      ],
      { value: amount }
    );
    expect(txHash).to.be.ok;

    const afterWalletBal = await publicClient.getBalance({ address: walletAddr });

    expect(afterWalletBal - beforeWalletBal).to.equal(amount);
  });

  it("reverts when msg.value is insufficient for ETH route", async function () {
    const { beam, merchantOwner, payer } = await deployFixture();

    const beamPayer = await hre.viem.getContractAt("Beam", beam.address, {
      client: { wallet: payer },
    } as any);

    const amount = parseEther("0.25");
    await expect(
      beamPayer.write.oneTimeTransaction(
        [
          {
            payers: [getAddress(payer.account.address)],
            merchant: getAddress(merchantOwner.account.address),
            amounts: [amount],
            token: zeroAddress,
            description: "d",
            metadata: { schemaVersion: 1, value: "m" },
          },
        ],
        { value: parseEther("0.1") }
      )
    ).to.be.rejected;
  });
});

