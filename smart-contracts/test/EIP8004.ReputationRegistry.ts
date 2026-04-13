import hre from "hardhat";
import { expect } from "chai";
import { getAddress } from "viem";

describe("ERC-8004 ReputationRegistry", function () {
  it("accepts feedback from non-owner and blocks owner/operator", async function () {
    const [owner, other] = await hre.viem.getWalletClients();

    const identity = await hre.viem.deployContract("IdentityRegistry");
    const rep = await hre.viem.deployContract("ReputationRegistry");
    await rep.write.initialize([identity.address]);

    // owner registers agentId=1
    await identity.write.register(["ipfs://agent.json"]);

    // other can leave feedback
    const repOther = await hre.viem.getContractAt(
      "ReputationRegistry",
      rep.address,
      { client: { wallet: other } } as any
    );

    await repOther.write.giveFeedback([
      1n,
      87, // value
      0, // decimals
      "starred",
      "",
      "https://agent.example",
      "ipfs://feedback.json",
      `0x${"00".repeat(32)}`,
    ]);

    const last = await rep.read.getLastIndex([1n, getAddress(other.account.address)]);
    expect(last).to.equal(1n);

    // owner cannot leave feedback for own agent
    await expect(
      rep.write.giveFeedback([
        1n,
        1,
        0,
        "reachable",
        "",
        "",
        "",
        `0x${"00".repeat(32)}`,
      ])
    ).to.be.rejected;

    // approve other as operator and ensure operator cannot leave feedback either
    await identity.write.approve([getAddress(other.account.address), 1n]);
    await expect(
      repOther.write.giveFeedback([
        1n,
        1,
        0,
        "reachable",
        "",
        "",
        "",
        `0x${"00".repeat(32)}`,
      ])
    ).to.be.rejected;
  });
});

