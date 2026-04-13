import { Connection, type ClientMerchant } from "@/types/app";
import { defineStore } from "pinia";
import type { Merchant } from "beam-ts";
import { getTokens } from "beam-ts";
import { zeroAddress } from "viem";

export const useWalletStore = defineStore("wallet", {
  state: () => ({
    address: null as `0x${string}` | null,
    connection: Connection.Guest as Connection,
    merchant: null as Merchant | null,
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
      this.merchant = newMerchant;
    },
    setImage(newImage: File | null) {
      this.image = newImage;
    },
    setClientMerchant(newClientMerchant: ClientMerchant | null) {
      this.clientMerchant = newClientMerchant;
    },
  },
});
