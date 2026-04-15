import BeamSDK from '@railbeam/beam-ts';
import { Network } from '@railbeam/beam-ts';

let instance: BeamSDK | null = null;

export function getBeamSdk(): BeamSDK {
  if (!instance) {
    instance = new BeamSDK({
      network: Network.Mainnet,
      graphURL: import.meta.env.VITE_GRAPH_URL || undefined,
      transactionURL: import.meta.env.VITE_TRANSACTION_URL || undefined,
    });
  }
  return instance;
}
