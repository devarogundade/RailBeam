import BeamSDK from "beam-ts/src";
import { Network } from "beam-ts/src/enums";

let instance: BeamSDK | null = null;

export function getBeamSdk(): BeamSDK {
  if (!instance) {
    instance = new BeamSDK({
      network: Network.Testnet,
      graphURL: import.meta.env.VITE_GRAPH_URL || undefined,
      transactionURL: import.meta.env.VITE_TRANSACTION_URL || undefined,
    });
  }
  return instance;
}
