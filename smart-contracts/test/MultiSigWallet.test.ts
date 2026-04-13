import hre from "hardhat";
import { expect } from "chai";
import { getAddress, parseEther, zeroAddress } from "viem";

describe("MultiSigWallet", function () {
  it("accepts deposits (ETH/ERC20) and enforces withdraw approvals", async function () {
    const [merchant, signer1, signer2, recipient, other] =
      await hre.viem.getWalletClients();

    const token = await hre.viem.deployContract("MockERC20", ["Mock", "MOCK"]);

    const wallet = await hre.viem.deployContract("MultiSigWallet", [
      getAddress(merchant.account.address),
      [zeroAddress, token.address],
      [getAddress(signer1.account.address), getAddress(signer2.account.address)],
      2n,
    ]);

    // ETH deposit
    const ethAmount = parseEther("1");
    await wallet.write.deposit([zeroAddress, ethAmount], { value: ethAmount });
    const publicClient = await hre.viem.getPublicClient();
    expect(await publicClient.getBalance({ address: wallet.address })).to.equal(ethAmount);

    // ERC20 deposit
    const ercAmount = parseEther("5");
    await token.write.mint([getAddress(other.account.address), ercAmount]);

    const tokenOther = await hre.viem.getContractAt("MockERC20", token.address, {
      client: { wallet: other },
    } as any);
    await tokenOther.write.approve([wallet.address, ercAmount]);
    const walletAsOther = await hre.viem.getContractAt("MultiSigWallet", wallet.address, {
      client: { wallet: other },
    } as any);
    await walletAsOther.write.deposit([token.address, ercAmount]);
    expect(await token.read.balanceOf([wallet.address])).to.equal(ercAmount);

    // only owner can request withdraw
    const walletOther = await hre.viem.getContractAt("MultiSigWallet", wallet.address, {
      client: { wallet: other },
    } as any);
    await expect(
      walletOther.write.requestWithdraw([zeroAddress, ethAmount, getAddress(recipient.account.address)])
    ).to.be.rejected;

    await wallet.write.requestWithdraw([
      zeroAddress,
      parseEther("0.4"),
      getAddress(recipient.account.address),
    ]);

    // only signers can approve
    await expect(walletOther.write.approveWithdraw([1n])).to.be.rejected;

    const walletSigner1 = await hre.viem.getContractAt("MultiSigWallet", wallet.address, {
      client: { wallet: signer1 },
    } as any);
    const walletSigner2 = await hre.viem.getContractAt("MultiSigWallet", wallet.address, {
      client: { wallet: signer2 },
    } as any);

    await walletSigner1.write.approveWithdraw([1n]);
    await expect(walletSigner1.write.approveWithdraw([1n])).to.be.rejected;

    // cannot execute until enough approvals
    await expect(wallet.write.executeWithdraw([1n])).to.be.rejected;

    await walletSigner2.write.approveWithdraw([1n]);

    const beforeRecipient = await publicClient.getBalance({
      address: getAddress(recipient.account.address),
    });

    await wallet.write.executeWithdraw([1n]);

    const afterRecipient = await publicClient.getBalance({
      address: getAddress(recipient.account.address),
    });
    expect(afterRecipient > beforeRecipient).to.equal(true);

    // cannot execute twice
    await expect(wallet.write.executeWithdraw([1n])).to.be.rejected;
  });

  it("rejects invalid deposits", async function () {
    const [merchant, signer1] = await hre.viem.getWalletClients();
    const token = await hre.viem.deployContract("MockERC20", ["Mock", "MOCK"]);

    const wallet = await hre.viem.deployContract("MultiSigWallet", [
      getAddress(merchant.account.address),
      [zeroAddress],
      [getAddress(signer1.account.address)],
      1n,
    ]);

    await expect(wallet.write.deposit([token.address, 1n])).to.be.rejected; // unsupported token
    await expect(wallet.write.deposit([zeroAddress, 0n], { value: 0n })).to.be.rejected; // amount zero
    await expect(wallet.write.deposit([zeroAddress, 1n], { value: 2n })).to.be.rejected; // mismatch msg.value
  });
});

