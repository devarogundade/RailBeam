import hre from "hardhat";
import { expect } from "chai";
import {
  getAddress,
  parseEther,
  zeroAddress,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
} from "viem";

describe("Beam flows", function () {
  async function deploySystem() {
    const [deployer, merchantOwner, payer1, payer2] =
      await hre.viem.getWalletClients();

    const hashLib = await hre.viem.deployContract("HashLib");
    const boolLib = await hre.viem.deployContract("BoolLib");
    const addressLib = await hre.viem.deployContract("AddressLib");
    const integerLib = await hre.viem.deployContract("IntegerLib");

    const receipt = await hre.viem.deployContract("Receipt", ["https://base/"]);
    const MINTER_ROLE = await receipt.read.MINTER_ROLE();

    const token = await hre.viem.deployContract("MockERC20", ["Mock", "MOCK"]);

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

    // Wire ownership
    await oneTime.write.transferOwnership([beam.address]);
    await recurrent.write.transferOwnership([beam.address]);
    await hookManager.write.transferOwnership([beam.address]);

    // Receipt minters
    await receipt.write.grantRole([MINTER_ROLE, oneTime.address]);
    await receipt.write.grantRole([MINTER_ROLE, recurrent.address]);

    // Create merchant wallet that accepts ETH + token, signer is merchantOwner
    const merchantAsOwner = await hre.viem.getContractAt("Merchant", merchant.address, {
      client: { wallet: merchantOwner },
    } as any);

    await merchantAsOwner.write.create([
      {
        metadata: { schemaVersion: 1, value: "m" },
        tokens: [zeroAddress, token.address],
        signers: [getAddress(merchantOwner.account.address)],
        minSigners: 1n,
      },
    ]);

    const walletAddr = await merchant.read.getWallet([
      getAddress(merchantOwner.account.address),
    ]);

    return {
      deployer,
      merchantOwner,
      payer1,
      payer2,
      token,
      receipt,
      merchant,
      merchantAsOwner,
      hookManager,
      oneTime,
      recurrent,
      beam,
      walletAddr,
    };
  }

  it("supports split ETH payment across multiple payers", async function () {
    const { beam, oneTime, merchantOwner, payer1, payer2, walletAddr } =
      await deploySystem();
    const publicClient = await hre.viem.getPublicClient();

    const beamPayer1 = await hre.viem.getContractAt("Beam", beam.address, {
      client: { wallet: payer1 },
    } as any);
    const beamPayer2 = await hre.viem.getContractAt("Beam", beam.address, {
      client: { wallet: payer2 },
    } as any);

    const a1 = parseEther("0.11");
    const a2 = parseEther("0.22");

    const beforeWalletBal = await publicClient.getBalance({ address: walletAddr });

    // payer1 creates + pays their share
    await beamPayer1.write.oneTimeTransaction(
      [
        {
          payers: [getAddress(payer1.account.address), getAddress(payer2.account.address)],
          merchant: getAddress(merchantOwner.account.address),
          amounts: [a1, a2],
          token: zeroAddress,
          description: "split",
          metadata: { schemaVersion: 1, value: "m" },
        },
      ],
      { value: a1 }
    );

    // derive txId = keccak256(abi.encode("OneTimeTransaction", lastId))
    const txId = keccak256(
      encodeAbiParameters(parseAbiParameters("string,uint256"), [
        "OneTimeTransaction",
        1n,
      ])
    );

    // payer2 fulfills + pays their share
    await beamPayer2.write.fulfillOneTimeTransaction(
      [{ transactionId: txId }],
      { value: a2 }
    );

    const afterWalletBal = await publicClient.getBalance({ address: walletAddr });
    expect(afterWalletBal - beforeWalletBal).to.equal(a1 + a2);

    expect(await oneTime.read.getStatus([txId])).to.equal(2); // Completed
  });

  it("routes ERC20 payments into wallet and records completion", async function () {
    const { beam, oneTime, token, merchantOwner, payer1, payer2, walletAddr } =
      await deploySystem();

    const beamPayer1 = await hre.viem.getContractAt("Beam", beam.address, {
      client: { wallet: payer1 },
    } as any);
    const beamPayer2 = await hre.viem.getContractAt("Beam", beam.address, {
      client: { wallet: payer2 },
    } as any);

    const a1 = parseEther("3");
    const a2 = parseEther("5");

    await token.write.mint([getAddress(payer1.account.address), a1]);
    await token.write.mint([getAddress(payer2.account.address), a2]);

    const tokenPayer1 = await hre.viem.getContractAt("MockERC20", token.address, {
      client: { wallet: payer1 },
    } as any);
    const tokenPayer2 = await hre.viem.getContractAt("MockERC20", token.address, {
      client: { wallet: payer2 },
    } as any);

    await tokenPayer1.write.approve([beam.address, a1]);
    await tokenPayer2.write.approve([beam.address, a2]);

    // payer1 creates + pays
    await beamPayer1.write.oneTimeTransaction([
      {
        payers: [getAddress(payer1.account.address), getAddress(payer2.account.address)],
        merchant: getAddress(merchantOwner.account.address),
        amounts: [a1, a2],
        token: token.address,
        description: "erc20-split",
        metadata: { schemaVersion: 1, value: "m" },
      },
    ]);

    const txId = keccak256(
      encodeAbiParameters(parseAbiParameters("string,uint256"), [
        "OneTimeTransaction",
        1n,
      ])
    );

    // payer2 fulfills + pays
    await beamPayer2.write.fulfillOneTimeTransaction([{ transactionId: txId }]);

    expect(await token.read.balanceOf([walletAddr])).to.equal(a1 + a2);
    expect(await oneTime.read.getStatus([txId])).to.equal(2); // Completed
  });

  it("supports subscriptions: create, first recurrent pay, fulfill later, cancel", async function () {
    const { beam, merchantOwner, merchantAsOwner, payer1, token, walletAddr, recurrent, receipt } =
      await deploySystem();
    const publicClient = await hre.viem.getPublicClient();

    const subParams = {
      token: zeroAddress,
      interval: 60n,
      amount: parseEther("0.05"),
      gracePeriod: 0n,
      description: "sub",
      catalogMetadata: { schemaVersion: 1, value: "c" },
    };

    await merchantAsOwner.write.createSubscription([subParams]);

    const subId = keccak256(
      encodeAbiParameters(parseAbiParameters("string,address,uint256"), [
        "Merchant",
        getAddress(merchantOwner.account.address),
        1n,
      ])
    );

    const beamPayer = await hre.viem.getContractAt("Beam", beam.address, {
      client: { wallet: payer1 },
    } as any);

    const beforeWallet = await publicClient.getBalance({ address: walletAddr });

    // initial recurrent payment (creates tx + fulfills once)
    await beamPayer.write.recurrentTransaction(
      [
        {
          merchant: getAddress(merchantOwner.account.address),
          subscriptionId: subId,
          description: "r",
          metadata: { schemaVersion: 1, value: "m" },
        },
      ],
      { value: subParams.amount }
    );

    const afterWallet = await publicClient.getBalance({ address: walletAddr });
    expect(afterWallet - beforeWallet).to.equal(subParams.amount);

    const txId = keccak256(
      encodeAbiParameters(parseAbiParameters("string,uint256"), [
        "RecurrentTransaction",
        1n,
      ])
    );

    // can mint a receipt after at least one onComplete
    const recurrentAsPayer = await hre.viem.getContractAt("RecurrentTransaction", recurrent.address, {
      client: { wallet: payer1 },
    } as any);
    await recurrentAsPayer.write.mintReceipt([
      { to: getAddress(payer1.account.address), transactionId: txId, URI: "ipfs://r1" },
    ]);
    expect(await receipt.read.ownerOf([1n])).to.equal(getAddress(payer1.account.address));

    // fulfill again only after interval
    await expect(
      beamPayer.write.fulfillRecurrentTransaction([{ transactionId: txId }], { value: subParams.amount })
    ).to.be.rejected;

    await hre.network.provider.send("evm_increaseTime", [61]);
    await hre.network.provider.send("evm_mine");

    await beamPayer.write.fulfillRecurrentTransaction([{ transactionId: txId }], { value: subParams.amount });

    // cancel stops future fulfill
    await beamPayer.write.cancelRecurrentTransaction([{ transactionId: txId }]);

    await hre.network.provider.send("evm_increaseTime", [61]);
    await hre.network.provider.send("evm_mine");

    await expect(
      beamPayer.write.fulfillRecurrentTransaction([{ transactionId: txId }], { value: subParams.amount })
    ).to.be.rejected;
  });

  it("applies hook-adjusted ETH amount (requires msg.value == adjustedAmount)", async function () {
    const { beam, hookManager, merchantOwner, payer1, walletAddr } = await deploySystem();
    const publicClient = await hre.viem.getPublicClient();

    const hook = await hre.viem.deployContract("MockHook", [false, false, true]);
    await hook.write.setAdjust([zeroAddress, parseEther("0.01")]);

    const hookManagerAsMerchant = await hre.viem.getContractAt("HookManager", hookManager.address, {
      client: { wallet: merchantOwner },
    } as any);
    await hookManagerAsMerchant.write.register([{ hook: hook.address }]);

    const beamPayer = await hre.viem.getContractAt("Beam", beam.address, {
      client: { wallet: payer1 },
    } as any);

    // Original amount is 0.02 but adjusted to 0.01; must send exactly adjusted.
    const before = await publicClient.getBalance({ address: walletAddr });

    await beamPayer.write.oneTimeTransaction(
      [
        {
          payers: [getAddress(payer1.account.address)],
          merchant: getAddress(merchantOwner.account.address),
          amounts: [parseEther("0.02")],
          token: zeroAddress,
          description: "adj",
          metadata: { schemaVersion: 1, value: "m" },
        },
      ],
      { value: parseEther("0.01") }
    );

    const after = await publicClient.getBalance({ address: walletAddr });
    expect(after - before).to.equal(parseEther("0.01"));

    await expect(
      beamPayer.write.oneTimeTransaction(
        [
          {
            payers: [getAddress(payer1.account.address)],
            merchant: getAddress(merchantOwner.account.address),
            amounts: [parseEther("0.02")],
            token: zeroAddress,
            description: "adj",
            metadata: { schemaVersion: 1, value: "m" },
          },
        ],
        { value: parseEther("0.02") }
      )
    ).to.be.rejected;
  });
});

