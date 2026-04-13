import hre from "hardhat";
import { expect } from "chai";
import { getAddress, parseEther, zeroHash } from "viem";

describe("BeamAgent", function () {
  it("forwards Beam calls with msg.sender = agent and forwards msg.value", async function () {
    const [owner] = await hre.viem.getWalletClients();

    const mockBeam = await hre.viem.deployContract("MockBeam");
    const factory = await hre.viem.deployContract("BeamAgentFactory", [
      mockBeam.address as `0x${string}`,
    ]);

    const agentAddress = (await factory.read.predictDeterministicAddress([
      getAddress(owner.account.address),
      zeroHash,
    ])) as `0x${string}`;

    await factory.write.deployDeterministic(
      [getAddress(owner.account.address), zeroHash],
      {}
    );

    const agent = (await hre.viem.getContractAt(
      "BeamAgent",
      agentAddress
    )) as any;

    const value = parseEther("0.123");

    await agent.write.oneTimeTransaction(
      [
        {
          payers: [getAddress(owner.account.address)],
          merchant: getAddress(owner.account.address),
          amounts: [value],
          token: getAddress("0x0000000000000000000000000000000000000000"),
          description: "test",
          metadata: { schemaVersion: 1, value: "m" },
        },
      ],
      { value }
    );

    expect(await mockBeam.read.lastCaller()).to.equal(getAddress(agentAddress));
    expect(await mockBeam.read.lastValue()).to.equal(value);
  });
});

