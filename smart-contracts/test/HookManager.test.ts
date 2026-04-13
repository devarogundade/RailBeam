import hre from "hardhat";
import { expect } from "chai";
import { getAddress, parseEther, zeroAddress } from "viem";

describe("HookManager", function () {
  it("registers/unregisters hooks per merchant and only owner can invoke payment hooks", async function () {
    const [deployer, merchant, payer] = await hre.viem.getWalletClients();

    const addressLib = await hre.viem.deployContract("AddressLib");
    const hookManager = await hre.viem.deployContract("HookManager", [], {
      libraries: { AddressLib: addressLib.address },
    });
    const hook = await hre.viem.deployContract("MockHook", [true, true, true]);

    const hookManagerMerchant = await hre.viem.getContractAt(
      "HookManager",
      hookManager.address,
      { client: { wallet: merchant } } as any
    );

    await hookManagerMerchant.write.register([{ hook: hook.address }]);
    expect(
      getAddress(await hookManager.read.getHook([getAddress(merchant.account.address)]))
    ).to.equal(getAddress(hook.address));

    // cannot register twice
    await expect(
      hookManagerMerchant.write.register([{ hook: hook.address }])
    ).to.be.rejected;

    // adjust behavior
    await hook.write.setAdjust([zeroAddress, parseEther("0.5")]);
    const [adjToken, adjAmount] = await hookManager.read.adjustTokenAmount([
      {
        merchant: getAddress(merchant.account.address),
        payer: getAddress(payer.account.address),
        token: zeroAddress,
        amount: parseEther("1"),
      },
    ]);
    expect(adjToken).to.equal(zeroAddress);
    expect(adjAmount).to.equal(parseEther("0.5"));

    // only owner can call before/after
    const hmMerchant = await hre.viem.getContractAt(
      "HookManager",
      hookManager.address,
      { client: { wallet: merchant } } as any
    );
    await expect(
      hmMerchant.write.beforePayment([
        {
          merchant: getAddress(merchant.account.address),
          payer: getAddress(payer.account.address),
          token: zeroAddress,
          amount: 1n,
        },
      ])
    ).to.be.rejected;

    await hookManager.write.beforePayment([
      {
        merchant: getAddress(merchant.account.address),
        payer: getAddress(payer.account.address),
        token: zeroAddress,
        amount: 1n,
      },
    ]);

    await hookManager.write.afterPayment([
      {
        merchant: getAddress(merchant.account.address),
        transactionId: `0x${"aa".repeat(32)}`,
        payer: getAddress(payer.account.address),
        token: zeroAddress,
        amount: 1n,
        adjustedToken: zeroAddress,
        adjustedAmount: 1n,
      },
    ]);

    expect(await hook.read.beforeCount()).to.equal(1n);
    expect(await hook.read.afterCount()).to.equal(1n);

    await hookManagerMerchant.write.unRegister();
    expect(
      await hookManager.read.getHook([getAddress(merchant.account.address)])
    ).to.equal(zeroAddress);
  });
});

