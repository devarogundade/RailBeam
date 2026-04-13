import { BaseMerchant } from "./base";
import { BeamClient } from "../client";
import { IMerchant } from "../interfaces/merchant";
import type {
  GetMerchant,
  Merchant as MerchantType,
  CatalogPlan,
} from "../types";
import type { Hex } from "viem";

export class Merchant extends BaseMerchant implements IMerchant {
  constructor(client: BeamClient) {
    super(client);
  }

  getMerchant(params: GetMerchant): Promise<MerchantType | null> {
    return this.graph.getMerchant(params.merchant);
  }

  getPlans(merchant: Hex): Promise<CatalogPlan[]> {
    return this.graph.getPlans(merchant);
  }

  getPlan(id: string): Promise<CatalogPlan | null> {
    return this.graph.getPlan(id);
  }
}
