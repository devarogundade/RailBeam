import BeamSDK from "@railbeam/beam-ts";
import { Network } from "@railbeam/beam-ts";

const opts: ConstructorParameters<typeof BeamSDK>[0] = {
  network: Network.Testnet,
};

export const beamSdk = new BeamSDK(opts);
