import hre from "hardhat";
import { expect } from "chai";
import { getAddress, keccak256, toHex } from "viem";

describe("ERC-8004 ValidationRegistry", function () {
  it("allows owner/operator to request and only validator to respond", async function () {
    const [owner, validator, other] = await hre.viem.getWalletClients();

    const identity = await hre.viem.deployContract("IdentityRegistry");
    const vr = await hre.viem.deployContract("ValidationRegistry");
    await vr.write.initialize([identity.address]);

    // owner registers agentId=1
    await identity.write.register(["ipfs://agent.json"]);

    const requestHash = keccak256(toHex("req-1"));

    // other cannot request
    const vrOther = await hre.viem.getContractAt("ValidationRegistry", vr.address, {
      client: { wallet: other },
    } as any);
    await expect(
      vrOther.write.validationRequest([
        getAddress(validator.account.address),
        1n,
        "ipfs://request.json",
        requestHash,
      ])
    ).to.be.rejected;

    // owner can request
    await vr.write.validationRequest([
      getAddress(validator.account.address),
      1n,
      "ipfs://request.json",
      requestHash,
    ]);

    // only validator can respond
    await expect(
      vr.write.validationResponse([requestHash, 100, "ipfs://resp.json", requestHash, "hard"])
    ).to.be.rejected;

    const vrValidator = await hre.viem.getContractAt("ValidationRegistry", vr.address, {
      client: { wallet: validator },
    } as any);

    await vrValidator.write.validationResponse([
      requestHash,
      100,
      "ipfs://resp.json",
      requestHash,
      "hard",
    ]);

    const status = await vr.read.getValidationStatus([requestHash]);
    expect(status[0]).to.equal(getAddress(validator.account.address));
    expect(status[1]).to.equal(1n);
    expect(status[2]).to.equal(100);
  });
});

