import type { Hex } from "viem";
import type { GetMerchant, Merchant, CatalogPlan } from "../types";

export interface IMerchant {
  getMerchant(params: GetMerchant): Promise<Merchant | null>;
  getPlans(merchant: Hex): Promise<CatalogPlan[]>;
  getPlan(id: string): Promise<CatalogPlan | null>;
}
