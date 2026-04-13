import { Connection, type ClientMerchant } from "@/scripts/types";
import { defineStore } from "pinia";
import type { Merchant } from "beam-ts/src/types";
import { getTokens } from "beam-ts/src/utils/constants";
import { zeroAddress } from "viem";

export const useWalletStore = defineStore("wallet", {
  state: () => ({
    address: null as `0x${string}` | null,
    connection: Connection.Guest as Connection,
    merchant: {
      id: zeroAddress,
      merchant: "0x1234567890123456789012345678901234567890",
      metadata_schemaVersion: 1,
      metadata_value: JSON.stringify({
        name: "Test Merchant",
        description: "Test Description",
        image: "https://example.com/image.png",
        website: "https://example.com",
        email: "test@example.com",
        phone: "1234567890",
        address: "123 Main St, Anytown, USA",
        city: "Anytown",
        state: "CA",
        zip: "12345",
        country: "USA",
      }),
      wallet: "0x1234567890123456789012345678901234567890",
      tokens: getTokens.map((t) => t.address),
      hook: zeroAddress,
      signers: [],
      minSigners: 0,
      blockNumber: 0,
      blockTimestamp: 0,
      transactionHash: zeroAddress,
    } as Merchant | null,
    image: null as File | null,
    clientMerchant: null as ClientMerchant | null,
  }),
  actions: {
    setAddress(newAddress: `0x${string}` | null) {
      this.address = newAddress;
    },
    setConnection(newConnection: Connection) {
      this.connection = newConnection;
    },
    setMerchant(newMerchant: Merchant | null) {
      // this.merchant = newMerchant;
      this.merchant = {
        id: zeroAddress,
        merchant: "0x1234567890123456789012345678901234567890",
        metadata_schemaVersion: 1,
        metadata_value: "{}",
        wallet: "0x1234567890123456789012345678901234567890",
        tokens: getTokens.map((t) => t.address),
        hook: zeroAddress,
        signers: [],
        minSigners: 0,
        blockNumber: 0,
        blockTimestamp: 0,
        transactionHash: zeroAddress,
      };
    },
    setImage(newImage: File | null) {
      this.image = newImage;
    },
    setClientMerchant(newClientMerchant: ClientMerchant | null) {
      this.clientMerchant = newClientMerchant;
    },
  },
});
