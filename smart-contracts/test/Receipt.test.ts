import hre from "hardhat";
import { expect } from "chai";
import { getAddress } from "viem";

describe("Receipt", function () {
  it("mints sequential tokenIds and stores tokenURI (MINTER_ROLE gated)", async function () {
    const [admin, minter, user] = await hre.viem.getWalletClients();

    const receipt = await hre.viem.deployContract("Receipt", [
      "https://example.com/base/",
    ]);

    const MINTER_ROLE = await receipt.read.MINTER_ROLE();

    const receiptMinter = await hre.viem.getContractAt("Receipt", receipt.address, {
      client: { wallet: minter },
    } as any);

    await expect(
      receiptMinter.write.mint([
        { to: getAddress(user.account.address), transactionId: `0x${"11".repeat(32)}`, URI: "ipfs://1" },
      ])
    ).to.be.rejected;

    await receipt.write.grantRole([MINTER_ROLE, getAddress(minter.account.address)]);

    await receiptMinter.write.mint([
      { to: getAddress(user.account.address), transactionId: `0x${"11".repeat(32)}`, URI: "ipfs://1" },
    ]);

    expect(await receipt.read.ownerOf([1n])).to.equal(getAddress(user.account.address));
    expect(await receipt.read.tokenURI([1n])).to.equal("ipfs://1");

    await receiptMinter.write.mint([
      { to: getAddress(user.account.address), transactionId: `0x${"22".repeat(32)}`, URI: "ipfs://2" },
    ]);

    expect(await receipt.read.ownerOf([2n])).to.equal(getAddress(user.account.address));
    expect(await receipt.read.tokenURI([2n])).to.equal("ipfs://2");
    expect(await receipt.read.baseURI()).to.equal("https://example.com/base/");
  });
});

