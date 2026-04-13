import hre from "hardhat";
import { expect } from "chai";
import { getAddress, parseEther, zeroAddress } from "viem";

describe("Merchant", function () {
  async function deployFixture() {
    const [owner, signer1, signer2] = await hre.viem.getWalletClients();

    const hashLib = await hre.viem.deployContract("HashLib");

    const merchant = await hre.viem.deployContract("Merchant", [], {
      libraries: { HashLib: hashLib.address },
    });

    return { merchant, owner, signer1, signer2 };
  }

  it("creates merchant once and exposes wallet", async function () {
    const { merchant, owner, signer1, signer2 } = await deployFixture();

    const minEth = parseEther("0.01");

    await merchant.write.create(
      [
        {
          metadata: { schemaVersion: 1, value: "m" },
          tokens: [zeroAddress],
          signers: [
            getAddress(signer1.account.address),
            getAddress(signer2.account.address),
          ],
          minSigners: 2n,
        },
      ],
      { value: minEth }
    );

    const wallet = await merchant.read.getWallet([getAddress(owner.account.address)]);
    expect(wallet).to.not.equal(zeroAddress);

    await expect(
      merchant.write.create([
        {
          metadata: { schemaVersion: 1, value: "m" },
          tokens: [zeroAddress],
          signers: [getAddress(signer1.account.address)],
          minSigners: 1n,
        },
      ])
    ).to.be.rejected;
  });

  it("updates metadata and manages subscriptions", async function () {
    const { merchant, owner, signer1, signer2 } = await deployFixture();

    await merchant.write.create(
      [
        {
          metadata: { schemaVersion: 1, value: "m" },
          tokens: [zeroAddress],
          signers: [
            getAddress(signer1.account.address),
            getAddress(signer2.account.address),
          ],
          minSigners: 2n,
        },
      ],
      { value: 0n }
    );

    await merchant.write.update([
      { metadata: { schemaVersion: 1, value: "updated" } },
    ]);

    const cfg = await merchant.read.getMerchant([getAddress(owner.account.address)]);
    expect(cfg.metadata.value).to.equal("updated");

    // create subscription
    const subParams = {
      token: zeroAddress,
      interval: 60n,
      amount: parseEther("0.1"),
      gracePeriod: 0n,
      description: "plan",
      catalogMetadata: { schemaVersion: 1, value: "c" },
    };
    const { result: subId } = await merchant.simulate.createSubscription([subParams]);
    await merchant.write.createSubscription([subParams]);

    const sub = await merchant.read.getSubscription([subId as any]);
    expect(sub.merchant).to.equal(getAddress(owner.account.address));
    expect(sub.active).to.equal(true);

    // update subscription
    await merchant.write.updateSubscription([
      {
        subscriptionId: subId as any,
        amount: parseEther("0.2"),
        gracePeriod: 1n,
        description: "plan2",
        catalogMetadata: { schemaVersion: 1, value: "c2" },
        active: false,
      },
    ]);

    const sub2 = await merchant.read.getSubscription([subId as any]);
    expect(sub2.amount).to.equal(parseEther("0.2"));
    expect(sub2.active).to.equal(false);

    // delete subscription
    await merchant.write.deleteSubscription([{ subscriptionId: subId as any }]);
    const sub3 = await merchant.read.getSubscription([subId as any]);
    expect(sub3.merchant).to.equal(zeroAddress);
  });
});

