import hre from "hardhat";
import { expect } from "chai";
import { encodeAbiParameters, getAddress, keccak256, parseAbiParameters, parseEther, zeroAddress } from "viem";

describe("Transactions", function () {
  async function deployFixture() {
    const [deployer, merchantOwner, payer1, payer2] =
      await hre.viem.getWalletClients();

    const hashLib = await hre.viem.deployContract("HashLib");
    const boolLib = await hre.viem.deployContract("BoolLib");

    const merchant = await hre.viem.deployContract("Merchant", [], {
      libraries: { HashLib: hashLib.address },
    });

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

    const receipt = await hre.viem.deployContract("Receipt", ["https://base/"]);
    const MINTER_ROLE = await receipt.read.MINTER_ROLE();

    const oneTime = await hre.viem.deployContract("OneTimeTransaction", [receipt.address], {
      libraries: { HashLib: hashLib.address, BoolLib: boolLib.address },
    });
    const recurrent = await hre.viem.deployContract(
      "RecurrentTransaction",
      [receipt.address, merchant.address],
      { libraries: { HashLib: hashLib.address } }
    );

    // allow minting via transaction contracts
    await receipt.write.grantRole([MINTER_ROLE, oneTime.address]);
    await receipt.write.grantRole([MINTER_ROLE, recurrent.address]);

    return {
      receipt,
      merchant,
      oneTime,
      recurrent,
      deployer,
      merchantOwner,
      payer1,
      payer2,
    };
  }

  it("OneTimeTransaction: fulfill all payers then mint receipt (payer only)", async function () {
    const { receipt, oneTime, payer1, payer2, merchantOwner, deployer } =
      await deployFixture();

    const ownerClient = await hre.viem.getContractAt("OneTimeTransaction", oneTime.address, {
      client: { wallet: deployer },
    } as any);

    // only owner can create
    const oneTimePayer = await hre.viem.getContractAt("OneTimeTransaction", oneTime.address, {
      client: { wallet: payer1 },
    } as any);
    await expect(
      oneTimePayer.write.create([
        getAddress(payer1.account.address),
        {
          payers: [getAddress(payer1.account.address)],
          merchant: getAddress(merchantOwner.account.address),
          amounts: [1n],
          token: zeroAddress,
          description: "d",
          metadata: { schemaVersion: 1, value: "m" },
        },
      ])
    ).to.be.rejected;

    const createParams = [
      getAddress(payer1.account.address),
      {
        payers: [getAddress(payer1.account.address), getAddress(payer2.account.address)],
        merchant: getAddress(merchantOwner.account.address),
        amounts: [parseEther("0.1"), parseEther("0.2")],
        token: zeroAddress,
        description: "d",
        metadata: { schemaVersion: 1, value: "m" },
      },
    ] as const;
    const { result: txId } = await ownerClient.simulate.create(createParams);
    await ownerClient.write.create(createParams);

    // fulfill payer1
    const ownerAsOwner = ownerClient;
    const { result: fulfill1 } = await ownerAsOwner.simulate.onFulfill([
      txId as any,
      getAddress(payer1.account.address),
    ]);
    expect(fulfill1[0]).to.equal(false);
    expect(fulfill1[1]).to.equal(parseEther("0.1"));
    await ownerAsOwner.write.onFulfill([
      txId as any,
      getAddress(payer1.account.address),
    ]);

    // cannot fulfill same payer twice
    await expect(
      ownerAsOwner.write.onFulfill([txId as any, getAddress(payer1.account.address)])
    ).to.be.rejected;

    // fulfill payer2 completes
    const { result: fulfill2 } = await ownerAsOwner.simulate.onFulfill([
      txId as any,
      getAddress(payer2.account.address),
    ]);
    expect(fulfill2[0]).to.equal(true);
    expect(fulfill2[1]).to.equal(parseEther("0.2"));
    await ownerAsOwner.write.onFulfill([
      txId as any,
      getAddress(payer2.account.address),
    ]);

    // complete tx
    await ownerAsOwner.write.onComplete([txId as any]);

    // payer can mint receipt; non-payer rejected
    const oneTimePayer2 = await hre.viem.getContractAt("OneTimeTransaction", oneTime.address, {
      client: { wallet: payer2 },
    } as any);
    await oneTimePayer2.write.mintReceipt([
      { to: getAddress(payer2.account.address), transactionId: txId as any, URI: "ipfs://r2" },
    ]);

    await oneTimePayer.write.mintReceipt([
      { to: getAddress(payer1.account.address), transactionId: txId as any, URI: "ipfs://r" },
    ]);

    // payer2 minted first -> tokenId=1, payer1 minted second -> tokenId=2
    expect(await receipt.read.ownerOf([1n])).to.equal(getAddress(payer2.account.address));
    expect(await receipt.read.tokenURI([1n])).to.equal("ipfs://r2");
    expect(await receipt.read.ownerOf([2n])).to.equal(getAddress(payer1.account.address));
    expect(await receipt.read.tokenURI([2n])).to.equal("ipfs://r");

    const oneTimeNonPayer = await hre.viem.getContractAt("OneTimeTransaction", oneTime.address, {
      client: { wallet: merchantOwner },
    } as any);
    await expect(
      oneTimeNonPayer.write.mintReceipt([
        {
          to: getAddress(merchantOwner.account.address),
          transactionId: txId as any,
          URI: "ipfs://x",
        },
      ])
    ).to.be.rejected;
  });

  it("RecurrentTransaction: enforces due date and subscription active", async function () {
    const { recurrent, merchant, merchantOwner, payer1, deployer } =
      await deployFixture();

    const ownerClient = await hre.viem.getContractAt("RecurrentTransaction", recurrent.address, {
      client: { wallet: deployer },
    } as any);

    const merchantAsOwner = await hre.viem.getContractAt("Merchant", merchant.address, {
      client: { wallet: merchantOwner },
    } as any);

    const subParams = {
      token: zeroAddress,
      interval: 60n,
      amount: parseEther("0.1"),
      gracePeriod: 0n,
      description: "plan",
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

    const createRecurrentParams = [
      getAddress(payer1.account.address),
      {
        merchant: getAddress(merchantOwner.account.address),
        subscriptionId: subId as any,
        description: "sub",
        metadata: { schemaVersion: 1, value: "m" },
      },
    ] as const;
    const { result: txId } = await ownerClient.simulate.create(createRecurrentParams);
    await ownerClient.write.create(createRecurrentParams);

    // first fulfill should succeed (and update dueDate)
    const fulfillRes = await ownerClient.read.onFulfill([
      txId as any,
      getAddress(payer1.account.address),
    ]);
    expect(fulfillRes[0]).to.equal(parseEther("0.1"));
    expect(fulfillRes[1]).to.equal(zeroAddress);
    expect(fulfillRes[2] > 0n).to.equal(true);
    await ownerClient.write.onFulfill([txId as any, getAddress(payer1.account.address)]);

    // second fulfill before due should revert
    await expect(
      ownerClient.write.onFulfill([txId as any, getAddress(payer1.account.address)])
    ).to.be.rejected;

    // make subscription inactive -> after time travel, should still fail because inactive
    await merchantAsOwner.write.updateSubscription([
      {
        subscriptionId: subId as any,
        amount: parseEther("0.1"),
        gracePeriod: 0n,
        description: "plan",
        catalogMetadata: { schemaVersion: 1, value: "c" },
        active: false,
      },
    ]);

    await hre.network.provider.send("evm_increaseTime", [61]);
    await hre.network.provider.send("evm_mine");

    await expect(
      ownerClient.read.onFulfill([txId as any, getAddress(payer1.account.address)])
    ).to.be.rejected;
  });
});

