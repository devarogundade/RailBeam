import BeamSDK from "beam-ts/src";
import { Network } from "@/scripts/types";

const opts: ConstructorParameters<typeof BeamSDK>[0] = {
  network: Network.Testnet,
};

if (import.meta.env.VITE_BEAM_GRAPH_URL) {
  opts.graphURL = import.meta.env.VITE_BEAM_GRAPH_URL;
}
if (import.meta.env.VITE_BEAM_TRANSACTION_URL) {
  opts.transactionURL = import.meta.env.VITE_BEAM_TRANSACTION_URL;
}

export const beamSdk = new BeamSDK(opts);
