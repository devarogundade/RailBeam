import BeamSDK from "@railbeam/beam-ts";
import { Network } from "@railbeam/beam-ts";

const opts: ConstructorParameters<typeof BeamSDK>[0] = {
  network: Network.Mainnet,
};

export const beamSdk = new BeamSDK(opts);
