import hre from "hardhat";
import { expect } from "chai";
import { getAddress } from "viem";

describe("ERC-8004 IdentityRegistry", function () {
  it("sets agentWallet to a BeamAgent using ERC-1271 proof", async function () {
    const [owner] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const identity = await hre.viem.deployContract("IdentityRegistry");

    // A minimal ERC-1271 wallet that validates EIP-712 signatures by `owner`.
    const wallet1271 = await hre.viem.deployContract("MockERC1271Wallet", [
      getAddress(owner.account.address),
    ]);
    const agentAddress = wallet1271.address as `0x${string}`;

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

    // Owner signs; contract validates via ERC-1271
    const signature = await owner.signTypedData({
      domain,
      types,
      primaryType: "SetAgentWallet",
      message,
    });

    await identity.write.setAgentWallet([1n, agentAddress, deadline, signature]);

    expect(getAddress(await identity.read.getAgentWallet([1n]))).to.equal(
      getAddress(agentAddress)
    );
  });
});

