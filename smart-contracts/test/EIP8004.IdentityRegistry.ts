import hre from "hardhat";
import { expect } from "chai";
import { getAddress, keccak256, toHex, zeroHash } from "viem";

describe("ERC-8004 IdentityRegistry", function () {
  it("sets agentWallet to a BeamAgent using ERC-1271 proof", async function () {
    const [owner] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const identity = await hre.viem.deployContract("IdentityRegistry");
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

    // register agentId=1 to owner
    await identity.write.register(["ipfs://agent.json"]);

    const chainId = publicClient.chain.id;
    const domain = {
      name: "ERC-8004 Identity Registry",
      version: "1",
      chainId,
      verifyingContract: identity.address,
    } as const;

    const types = {
      SetAgentWallet: [
        { name: "agentId", type: "uint256" },
        { name: "newWallet", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
    } as const;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const message = {
      agentId: 1n,
      newWallet: agentAddress,
      deadline,
    } as const;

    // Owner signs; BeamAgent will validate via ERC-1271 (owner() == signer)
    const signature = await owner.signTypedData({
      domain,
      types,
      primaryType: "SetAgentWallet",
      message,
    });

    await identity.write.setAgentWallet([1n, agentAddress, deadline, signature]);

    expect(await identity.read.getAgentWallet([1n])).to.equal(agentAddress);
  });
});

