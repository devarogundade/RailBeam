import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
} from "matchstick-as/assembly/index";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { handleHookRegistered, handleMerchantCreated } from "../src/events";
import {
  createHookRegisteredEvent,
  createMerchantCreatedEvent,
} from "./events-utils";

describe("Beam subgraph mapping", () => {
  beforeAll(() => {
    let merchantAddr = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    );
    let walletAddr = Address.fromString(
      "0x0000000000000000000000000000000000000002"
    );
    let hookAddr = Address.fromString(
      "0x0000000000000000000000000000000000000003"
    );

    let metadata = new ethereum.Tuple(2);
    metadata[0] = ethereum.Value.fromI32(1);
    metadata[1] = ethereum.Value.fromString("{}");

    let tokens = new Array<Address>();
    tokens.push(Address.fromString("0x0000000000000000000000000000000000000004"));

    let signers = new Array<Address>();
    signers.push(Address.fromString("0x0000000000000000000000000000000000000005"));

    let created = createMerchantCreatedEvent(
      merchantAddr,
      metadata,
      walletAddr,
      tokens,
      signers,
      BigInt.fromI32(1)
    );
    handleMerchantCreated(created);

    let hookEv = createHookRegisteredEvent(merchantAddr, hookAddr);
    handleHookRegistered(hookEv);
  });

  afterAll(() => {
    clearStore();
  });

  test("MerchantCreated then HookRegistered updates Merchant.hook", () => {
    assert.entityCount("Merchant", 1);
    assert.fieldEquals(
      "Merchant",
      "0x0000000000000000000000000000000000000001",
      "hook",
      "0x0000000000000000000000000000000000000003"
    );
  });
});
