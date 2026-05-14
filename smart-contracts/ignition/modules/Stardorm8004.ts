import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { stringToHex } from "viem";

import { STARDORM_SEED_AGENT_URIS } from "../data/seedAgentUris";
import IdentityRegistryModule from "./IdentityRegistry";
import ReputationRegistryModule from "./ReputationRegistry";
import ValidationRegistryModule from "./ValidationRegistry";

/**
 * Deploy Identity + Reputation + Validation registries (EIP-8004) and register
 */
export default buildModule("Stardorm8004Module", (m) => {
  const { identityRegistry } = m.useModule(IdentityRegistryModule);
  const { reputationRegistry } = m.useModule(ReputationRegistryModule);
  const { validationRegistry } = m.useModule(ValidationRegistryModule);

  let seedIndex = 0;
  for (const {
    uri,
    handlerCapabilities,
    feesPerDay,
  } of STARDORM_SEED_AGENT_URIS) {
    m.call(
      identityRegistry,
      "registerWithMetadataAndFees",
      [
        uri,
        [
          {
            metadataKey: handlerCapabilities.metadataKey,
            metadataValue: stringToHex(handlerCapabilities.metadataValue),
          },
        ],
        BigInt(feesPerDay),
      ],
      {
        id: `RegisterSeedAgent_${seedIndex}`,
      },
    );
    seedIndex++;
  }

  return {
    identityRegistry,
    reputationRegistry,
    validationRegistry,
  };
});
