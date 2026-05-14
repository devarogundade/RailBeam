import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { network } from "hardhat";
import { type Address, getAddress, stringToHex } from "viem";

const ERR = {
  UNAUTHORIZED: "2",
  INVALID_INPUT: "3",
  ACTION_NOT_ALLOWED: "4",
  INTERNAL_ERROR: "500",
  INVALID_SIGNATURE: "600",
  SIGNATURE_EXPIRED: "601",
} as const;

describe("Stardorm registries (Identity, Reputation, Validation)", async function () {
  const connection = await network.getOrCreate();
  const { viem, networkHelpers } = connection;

  after(async function () {
    await connection.close();
  });

  async function deployStardormFixture() {
    const publicClient = await viem.getPublicClient();
    const [deployer, alice, bob, validator] = await viem.getWalletClients();

    const identity = await viem.deployContract("IdentityRegistry", []);
    const reputation = await viem.deployContract("ReputationRegistry", []);
    const validation = await viem.deployContract("ValidationRegistry", []);

    await reputation.write.initialize([identity.address]);
    await validation.write.initialize([identity.address]);

    await identity.write.register(["https://example.com/agent.json"], {
      account: deployer.account,
    });
    const agentId = 1n;

    return {
      viem,
      networkHelpers,
      publicClient,
      deployer,
      alice,
      bob,
      validator,
      identity,
      reputation,
      validation,
      agentId,
    };
  }

  describe("IdentityRegistry", function () {
    it("mints agent NFT to caller and exposes URI + agent wallet", async function () {
      const { identity, deployer, agentId, publicClient } =
        await networkHelpers.loadFixture(deployStardormFixture);

      assert.equal(
        getAddress(await identity.read.ownerOf([agentId])),
        getAddress(deployer.account.address),
      );
      assert.equal(
        await identity.read.tokenURI([agentId]),
        "https://example.com/agent.json",
      );
      assert.equal(
        getAddress(await identity.read.getAgentWallet([agentId])),
        getAddress(deployer.account.address),
      );
      assert.equal(BigInt(await publicClient.getChainId()), 31337n);
    });

    it("setAgentURI updates metadata for authorized owner", async function () {
      const { identity, deployer, agentId } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await identity.write.setAgentURI(
        [agentId, "ipfs://new"],
        { account: deployer.account },
      );
      assert.equal(await identity.read.tokenURI([agentId]), "ipfs://new");
    });

    it("reverts setAgentURI for non-owner", async function () {
      const { identity, alice, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await v.assertions.revertWithCustomError(
        identity.write.setAgentURI([agentId, "x"], { account: alice.account }),
        identity,
        "ERC721InsufficientApproval",
      );
    });

    it("setMetadata stores arbitrary key/value (not agentWallet)", async function () {
      const { identity, deployer, agentId } =
        await networkHelpers.loadFixture(deployStardormFixture);

      const value = "0xabcd" as `0x${string}`;
      await identity.write.setMetadata(
        [agentId, "skills", value],
        { account: deployer.account },
      );
      assert.equal(
        await identity.read.getMetadata([agentId, "skills"]),
        value,
      );
    });

    it("reverts setMetadata for reserved agentWallet key", async function () {
      const { identity, deployer, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await v.assertions.revertWith(
        identity.write.setMetadata(
          [agentId, "agentWallet", "0x" as `0x${string}`],
          { account: deployer.account },
        ),
        ERR.ACTION_NOT_ALLOWED,
      );
    });

    it("setAgentWallet accepts EIP-712 signature from new EOA wallet", async function () {
      const {
        identity,
        deployer,
        alice,
        bob,
        agentId,
        publicClient,
        viem: v,
      } = await networkHelpers.loadFixture(deployStardormFixture);

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const chainId = await publicClient.getChainId();
      const domain = {
        name: "Beam Identity Registry",
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

      const signature = await alice.signTypedData({
        domain,
        types,
        primaryType: "SetAgentWallet",
        message: {
          agentId,
          newWallet: alice.account.address,
          deadline,
        },
      });

      await identity.write.setAgentWallet(
        [agentId, alice.account.address, deadline, signature],
        { account: deployer.account },
      );
      assert.equal(
        getAddress(await identity.read.getAgentWallet([agentId])),
        getAddress(alice.account.address),
      );

      const deadline2 = deadline + 999n;
      const badSig = await bob.signTypedData({
        domain,
        types,
        primaryType: "SetAgentWallet",
        message: {
          agentId,
          newWallet: alice.account.address,
          deadline: deadline2,
        },
      });

      await v.assertions.revertWith(
        identity.write.setAgentWallet(
          [agentId, alice.account.address, deadline2, badSig],
          { account: deployer.account },
        ),
        ERR.INVALID_SIGNATURE,
      );
    });

    it("reverts setAgentWallet when deadline has passed", async function () {
      const {
        identity,
        deployer,
        alice,
        agentId,
        publicClient,
        networkHelpers: nh,
        viem: v,
      } = await networkHelpers.loadFixture(deployStardormFixture);

      const latest = BigInt(await nh.time.latest());
      const deadline = latest + 120n;
      const chainId = await publicClient.getChainId();
      const signature = await alice.signTypedData({
        domain: {
          name: "Beam Identity Registry",
          version: "1",
          chainId,
          verifyingContract: identity.address,
        },
        types: {
          SetAgentWallet: [
            { name: "agentId", type: "uint256" },
            { name: "newWallet", type: "address" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "SetAgentWallet",
        message: {
          agentId,
          newWallet: alice.account.address,
          deadline,
        },
      });

      await nh.time.increaseTo(Number(deadline + 1n));

      await v.assertions.revertWith(
        identity.write.setAgentWallet(
          [agentId, alice.account.address, deadline, signature],
          { account: deployer.account },
        ),
        ERR.SIGNATURE_EXPIRED,
      );
    });

    it("clears agentWallet on ERC-721 transfer to a new owner", async function () {
      const {
        identity,
        deployer,
        alice,
        bob,
        agentId,
        publicClient,
      } = await networkHelpers.loadFixture(deployStardormFixture);

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 7200);
      const chainId = await publicClient.getChainId();
      const sig = await alice.signTypedData({
        domain: {
          name: "Beam Identity Registry",
          version: "1",
          chainId,
          verifyingContract: identity.address,
        },
        types: {
          SetAgentWallet: [
            { name: "agentId", type: "uint256" },
            { name: "newWallet", type: "address" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "SetAgentWallet",
        message: {
          agentId,
          newWallet: alice.account.address,
          deadline,
        },
      });
      await identity.write.setAgentWallet(
        [agentId, alice.account.address, deadline, sig],
        { account: deployer.account },
      );

      await identity.write.transferFrom(
        [deployer.account.address, bob.account.address, agentId],
        { account: deployer.account },
      );
      assert.equal(
        getAddress(await identity.read.ownerOf([agentId])),
        getAddress(bob.account.address),
      );
      assert.equal(
        await identity.read.getAgentWallet([agentId]),
        "0x0000000000000000000000000000000000000000",
      );
    });

    it("ERC-7857 transfer moves token when from matches owner", async function () {
      const { identity, deployer, alice, agentId } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await identity.write.transfer(
        [
          deployer.account.address,
          alice.account.address,
          agentId,
          "0x" as `0x${string}`,
          "0x" as `0x${string}`,
        ],
        { account: deployer.account },
      );
      assert.equal(
        getAddress(await identity.read.ownerOf([agentId])),
        getAddress(alice.account.address),
      );
    });

    it("clone mints a new token for recipient with same URI suffix", async function () {
      const { identity, deployer, alice, agentId } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await identity.write.clone(
        [
          alice.account.address,
          agentId,
          "0x" as `0x${string}`,
          "0x" as `0x${string}`,
        ],
        { account: deployer.account },
      );

      const newId = 2n;
      assert.equal(
        getAddress(await identity.read.ownerOf([newId])),
        getAddress(alice.account.address),
      );
      assert.equal(
        await identity.read.tokenURI([newId]),
        await identity.read.tokenURI([agentId]),
      );
    });

    it("register() mints an agent with empty URI", async function () {
      const { viem: v } = connection;
      const [deployer] = await v.getWalletClients();
      const identityFresh = await v.deployContract("IdentityRegistry", []);
      await identityFresh.write.register({
        account: deployer.account,
      });
      assert.equal(
        getAddress(await identityFresh.read.ownerOf([1n])),
        getAddress(deployer.account.address),
      );
      assert.equal(await identityFresh.read.tokenURI([1n]), "");
    });

    it("getFees is zero before setFees", async function () {
      const { identity, agentId } =
        await networkHelpers.loadFixture(deployStardormFixture);
      assert.equal(await identity.read.getFees([agentId]), 0n);
    });

    it("setFees is cumulative and getFees reflects total", async function () {
      const { identity, deployer, agentId } =
        await networkHelpers.loadFixture(deployStardormFixture);
      const a = 3n * 10n ** 14n;
      const b = 7n * 10n ** 14n;
      await identity.write.setFees([agentId, a], { account: deployer.account });
      await identity.write.setFees([agentId, b], { account: deployer.account });
      assert.equal(await identity.read.getFees([agentId]), a + b);
    });

    it("reverts setFees when caller is not authorized", async function () {
      const { identity, alice, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await v.assertions.revertWithCustomError(
        identity.write.setFees([agentId, 1n], { account: alice.account }),
        identity,
        "ERC721InsufficientApproval",
      );
    });

    it("setFees emits FeesSet", async function () {
      const { identity, deployer, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await v.assertions.emit(
        identity.write.setFees([agentId, 10n ** 15n], {
          account: deployer.account,
        }),
        identity,
        "FeesSet",
      );
    });

    it("reverts subscribe when daily fee is zero", async function () {
      const { identity, bob, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await v.assertions.revertWith(
        identity.write.subscribe([agentId, 1n], {
          account: bob.account,
          value: 1n,
        }),
        ERR.INVALID_INPUT,
      );
    });

    it("reverts subscribe when numDays is zero", async function () {
      const { identity, deployer, bob, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await identity.write.setFees([agentId, 10n ** 15n], {
        account: deployer.account,
      });
      await v.assertions.revertWith(
        identity.write.subscribe([agentId, 0n], {
          account: bob.account,
          value: 10n ** 18n,
        }),
        ERR.INVALID_INPUT,
      );
    });

    it("reverts subscribe when msg.value is below cost", async function () {
      const { identity, deployer, bob, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      const feePerDay = 10n ** 15n;
      await identity.write.setFees([agentId, feePerDay], {
        account: deployer.account,
      });
      await v.assertions.revertWith(
        identity.write.subscribe([agentId, 5n], {
          account: bob.account,
          value: feePerDay * 5n - 1n,
        }),
        ERR.INVALID_INPUT,
      );
    });

    it("subscribe emits Subscribed", async function () {
      const { identity, deployer, bob, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      const fee = 10n ** 15n;
      await identity.write.setFees([agentId, fee], { account: deployer.account });
      const days = 4n;
      await v.assertions.emit(
        identity.write.subscribe([agentId, days], {
          account: bob.account,
          value: fee * days,
        }),
        identity,
        "Subscribed",
      );
    });

    it("subscribe refunds excess ETH", async function () {
      const { identity, deployer, bob, agentId, publicClient } =
        await networkHelpers.loadFixture(deployStardormFixture);

      const feePerDay = 10n ** 15n;
      await identity.write.setFees([agentId, feePerDay], {
        account: deployer.account,
      });

      const beforeBob = await publicClient.getBalance({
        address: bob.account.address,
      });
      const numDays = 5n;
      const cost = feePerDay * numDays;
      const overpay = cost + 10n ** 14n;

      await identity.write.subscribe([agentId, numDays], {
        account: bob.account,
        value: overpay,
      });

      const afterBob = await publicClient.getBalance({
        address: bob.account.address,
      });
      assert.ok(afterBob >= beforeBob - cost - 10n ** 17n);
    });

    it("stacked subscribe extends window; full refund if unsubscribed immediately", async function () {
      const { identity, deployer, bob, agentId, publicClient, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      const fee = 10n ** 15n;
      await identity.write.setFees([agentId, fee], { account: deployer.account });
      const d1 = 10n;
      const d2 = 20n;
      await identity.write.subscribe([agentId, d1], {
        account: bob.account,
        value: fee * d1,
      });
      await identity.write.subscribe([agentId, d2], {
        account: bob.account,
        value: fee * d2,
      });

      const { result } = await publicClient.simulateContract({
        address: identity.address,
        abi: identity.abi,
        functionName: "unsubscribe",
        args: [agentId],
        account: bob.account,
      });
      const [, refund] = result as readonly [bigint, bigint];
      const expectedMax = fee * (d1 + d2);
      assert.ok(refund <= expectedMax);
      assert.ok(refund >= expectedMax - 10n ** 12n);

      await v.assertions.emit(
        identity.write.unsubscribe([agentId], { account: bob.account }),
        identity,
        "Unsubscribed",
      );
    });

    it("unsubscribe pro-rates refund after partial window", async function () {
      const {
        identity,
        deployer,
        bob,
        agentId,
        publicClient,
        networkHelpers: nh,
        viem: v,
      } = await networkHelpers.loadFixture(deployStardormFixture);

      const feePerDay = 10n ** 15n;
      await identity.write.setFees([agentId, feePerDay], {
        account: deployer.account,
      });

      const numDays = 5n;
      const cost = feePerDay * numDays;
      await identity.write.subscribe([agentId, numDays], {
        account: bob.account,
        value: cost + 10n ** 14n,
      });

      await nh.time.increase((Number(numDays) * 86_400) / 2);

      const { result } = await publicClient.simulateContract({
        address: identity.address,
        abi: identity.abi,
        functionName: "unsubscribe",
        args: [agentId],
        account: bob.account,
      });
      const [daysLeft, refund] = result as readonly [bigint, bigint];
      assert.ok(daysLeft > 0n);
      assert.ok(refund > 0n);

      await identity.write.unsubscribe([agentId], { account: bob.account });
      await v.assertions.revertWith(
        identity.write.unsubscribe([agentId], { account: bob.account }),
        ERR.INVALID_INPUT,
      );
    });

    it("reverts unsubscribe when caller has no subscription", async function () {
      const { identity, deployer, alice, bob, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await identity.write.setFees([agentId, 10n ** 15n], {
        account: deployer.account,
      });
      await identity.write.subscribe([agentId, 3n], {
        account: bob.account,
        value: 3n * 10n ** 15n,
      });

      await v.assertions.revertWith(
        identity.write.unsubscribe([agentId], { account: alice.account }),
        ERR.INVALID_INPUT,
      );
    });

    it("reverts unsubscribe after subscription expired", async function () {
      const { identity, deployer, bob, agentId, networkHelpers: nh, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await identity.write.setFees([agentId, 10n ** 15n], {
        account: deployer.account,
      });
      await identity.write.subscribe([agentId, 2n], {
        account: bob.account,
        value: 2n * 10n ** 15n,
      });

      await nh.time.increase(3 * 86_400);

      await v.assertions.revertWith(
        identity.write.unsubscribe([agentId], { account: bob.account }),
        ERR.INVALID_INPUT,
      );
    });

    it("registerWithMetadataAndFees sets metadata and fee", async function () {
      const { viem: v } = connection;
      const [deployer, , bob] = await v.getWalletClients();
      const identity = await v.deployContract("IdentityRegistry", []);
      const fee = 10n ** 15n;
      const metaKey = "skills";
      const metaVal = stringToHex("rust", { size: 32 });

      await identity.write.registerWithMetadataAndFees(
        [
          "https://meta.example/agent.json",
          [{ metadataKey: metaKey, metadataValue: metaVal }],
          fee,
        ],
        { account: deployer.account },
      );
      const agentId = 1n;
      assert.equal(await identity.read.getFees([agentId]), fee);
      assert.equal(
        await identity.read.getMetadata([agentId, metaKey]),
        metaVal,
      );

      await identity.write.subscribe([agentId, 1n], {
        account: bob.account,
        value: fee,
      });
    });

    it("unsetAgentWallet clears wallet for authorized owner", async function () {
      const {
        identity,
        deployer,
        alice,
        agentId,
        publicClient,
        viem: v,
      } = await networkHelpers.loadFixture(deployStardormFixture);

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 7200);
      const chainId = await publicClient.getChainId();
      const sig = await alice.signTypedData({
        domain: {
          name: "Beam Identity Registry",
          version: "1",
          chainId,
          verifyingContract: identity.address,
        },
        types: {
          SetAgentWallet: [
            { name: "agentId", type: "uint256" },
            { name: "newWallet", type: "address" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "SetAgentWallet",
        message: {
          agentId,
          newWallet: alice.account.address,
          deadline,
        },
      });
      await identity.write.setAgentWallet(
        [agentId, alice.account.address, deadline, sig],
        { account: deployer.account },
      );
      assert.equal(
        getAddress(await identity.read.getAgentWallet([agentId])),
        getAddress(alice.account.address),
      );

      await v.assertions.emit(
        identity.write.unsetAgentWallet([agentId], { account: deployer.account }),
        identity,
        "MetadataSet",
      );
      assert.equal(
        await identity.read.getAgentWallet([agentId]),
        "0x0000000000000000000000000000000000000000",
      );
    });
  });

  describe("ReputationRegistry", function () {
    it("reverts giveFeedback before initialize", async function () {
      const { viem: v } = connection;
      const reputation = await v.deployContract("ReputationRegistry", []);
      const identity = await v.deployContract("IdentityRegistry", []);
      await identity.write.register(["u"], { account: (await v.getWalletClients())[0].account });

      await v.assertions.revertWith(
        reputation.write.giveFeedback([
          1n,
          80n,
          0,
          "q",
          "",
          "e",
          "uri",
          "0x0000000000000000000000000000000000000000000000000000000000000001",
        ]),
        ERR.INTERNAL_ERROR,
      );
    });

    it("reverts double initialize", async function () {
      const { reputation, identity, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await v.assertions.revertWith(
        reputation.write.initialize([identity.address]),
        ERR.ACTION_NOT_ALLOWED,
      );
    });

    it("allows non-owner client to giveFeedback and owner to appendResponse", async function () {
      const { reputation, deployer, bob, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      const hash =
        "0x0000000000000000000000000000000000000000000000000000000000cafe01" as const;

      await reputation.write.giveFeedback(
        [agentId, 90n, 0, "quality", "", "ep", "fb", hash],
        { account: bob.account },
      );

      assert.equal(await reputation.read.getLastIndex([agentId, bob.account.address]), 1n);

      await v.assertions.emit(
        reputation.write.appendResponse(
          [agentId, bob.account.address, 1n, "resp", hash],
          { account: deployer.account },
        ),
        reputation,
        "ResponseAppended",
      );
    });

    it("reverts giveFeedback from token owner", async function () {
      const { reputation, deployer, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await v.assertions.revertWith(
        reputation.write.giveFeedback([
          agentId,
          1n,
          0,
          "t",
          "",
          "e",
          "u",
          "0x0000000000000000000000000000000000000000000000000000000000000002",
        ], { account: deployer.account }),
        ERR.UNAUTHORIZED,
      );
    });

    it("revokeFeedback marks entry revoked for summaries", async function () {
      const { reputation, bob, agentId } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await reputation.write.giveFeedback(
        [
          agentId,
          10n,
          0,
          "t1",
          "t2",
          "e",
          "u",
          "0x0000000000000000000000000000000000000000000000000000000000000003",
        ],
        { account: bob.account },
      );
      await reputation.write.revokeFeedback([agentId, 1n], { account: bob.account });

      const [count, sum, dec] = await reputation.read.getSummary([
        agentId,
        [bob.account.address] as Address[],
        "",
        "",
      ]);
      assert.equal(count, 0n);
      assert.equal(sum, 0n);
      assert.equal(dec, 18);
    });

    it("reverts getSummary with empty client list", async function () {
      const { reputation, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await v.assertions.revertWith(
        reputation.read.getSummary([agentId, [] as Address[], "", ""]),
        ERR.INVALID_INPUT,
      );
    });
  });

  describe("ValidationRegistry", function () {
    it("reverts validationRequest when registry not initialized", async function () {
      const { viem: v } = connection;
      const validation = await v.deployContract("ValidationRegistry", []);
      const identity = await v.deployContract("IdentityRegistry", []);
      const [d] = await v.getWalletClients();
      await identity.write.register(["x"], { account: d.account });

      await v.assertions.revertWith(
        validation.write.validationRequest([
          "0x0000000000000000000000000000000000000001",
          1n,
          "req",
          "0x00000000000000000000000000000000000000000000000000000000000000aa",
        ], { account: d.account }),
        ERR.INTERNAL_ERROR,
      );
    });

    it("owner can open validation request; validator posts response", async function () {
      const {
        validation,
        deployer,
        validator,
        agentId,
        viem: v,
      } = await networkHelpers.loadFixture(deployStardormFixture);

      const requestHash =
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

      await validation.write.validationRequest(
        [validator.account.address, agentId, "https://req", requestHash],
        { account: deployer.account },
      );

      await validation.write.validationResponse(
        [requestHash, 88, "https://res", requestHash, "audit"],
        { account: validator.account },
      );

      const st = await validation.read.getValidationStatus([requestHash]);
      assert.equal(getAddress(st[0]), getAddress(validator.account.address));
      assert.equal(st[1], agentId);
      assert.equal(st[2], 88);
      assert.equal(st[4], "audit");
    });

    it("reverts validationResponse from wrong validator", async function () {
      const {
        validation,
        deployer,
        validator,
        alice,
        agentId,
        viem: v,
      } = await networkHelpers.loadFixture(deployStardormFixture);

      const requestHash =
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
      await validation.write.validationRequest(
        [validator.account.address, agentId, "r", requestHash],
        { account: deployer.account },
      );

      await v.assertions.revertWith(
        validation.write.validationResponse(
          [requestHash, 50, "u", requestHash, "t"],
          { account: alice.account },
        ),
        ERR.UNAUTHORIZED,
      );
    });

    it("reverts validationRequest for non-owner", async function () {
      const { validation, alice, validator, agentId, viem: v } =
        await networkHelpers.loadFixture(deployStardormFixture);

      await v.assertions.revertWith(
        validation.write.validationRequest(
          [
            validator.account.address,
            agentId,
            "r",
            "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          ],
          { account: alice.account },
        ),
        ERR.UNAUTHORIZED,
      );
    });

    it("getSummary averages responses for agent", async function () {
      const { validation, deployer, validator, agentId } =
        await networkHelpers.loadFixture(deployStardormFixture);

      const h1 =
        "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" as const;
      const h2 =
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;

      await validation.write.validationRequest(
        [validator.account.address, agentId, "a", h1],
        { account: deployer.account },
      );
      await validation.write.validationRequest(
        [validator.account.address, agentId, "b", h2],
        { account: deployer.account },
      );

      await validation.write.validationResponse(
        [h1, 80, "u", h1, "x"],
        { account: validator.account },
      );
      await validation.write.validationResponse(
        [h2, 40, "u", h2, "x"],
        { account: validator.account },
      );

      const [count, avg] = await validation.read.getSummary([
        agentId,
        [] as Address[],
        "x",
      ]);
      assert.equal(count, 2n);
      assert.equal(avg, 60);
    });
  });
});
