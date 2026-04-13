import {
  HookRegistered as HookRegisteredEvent,
  HookUnRegistered as HookUnRegisteredEvent,
} from "../generated/HookManager/HookManager";
import { Merchant } from "../generated/schema";
import { Bytes } from "@graphprotocol/graph-ts";

export function handleHookRegistered(event: HookRegisteredEvent): void {
  let merchant = Merchant.load(event.params.merchant);
  if (!merchant) return;

  merchant.hook = event.params.hook;
  merchant.save();
}

export function handleHookUnRegistered(event: HookUnRegisteredEvent): void {
  let merchant = Merchant.load(event.params.merchant);
  if (!merchant) return;

  merchant.hook = Bytes.empty();
  merchant.save();
}

