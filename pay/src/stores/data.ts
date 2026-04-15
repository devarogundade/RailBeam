import { type Hex } from "viem";
import { defineStore } from "pinia";
import type { Metadata } from "@railbeam/beam-ts";
import type { TransactionType } from "@railbeam/beam-ts";

interface PayData {
  merchant: Hex;
  payers?: Hex[];
  amounts?: bigint[];
  token?: Hex;
  description?: string;
  metadata?: Metadata;
  subscriptionId?: Hex;
  type: TransactionType;
  /** When omitted, checkout defaults to split-friendly UI (`true`). */
  splitPayment?: boolean;
}

interface Initiator {
  url: string;
  title: string | null;
  favicon: string | null;
}

export const useDataStore = defineStore("data", {
  state: () => ({
    data: null as PayData | null,
    initiator: null as Initiator | null,
  }),
  actions: {
    setData(newData: PayData | null) {
      if (!newData) {
        this.data = null;
        return;
      }
      this.data = {
        ...newData,
        splitPayment: newData.splitPayment ?? true,
      };
    },
    setInitiator(newInitiator: Initiator | null) {
      this.initiator = newInitiator;
    },
  },
});
