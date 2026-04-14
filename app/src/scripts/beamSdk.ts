import BeamSDK from "beam-ts";
import { Network } from "beam-ts";

const opts: ConstructorParameters<typeof BeamSDK>[0] = {
  network: Network.Testnet,
};

export const beamSdk = new BeamSDK(opts);
