import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { x402Facilitator } from '@x402/core/facilitator';
import type {
  Network,
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from '@x402/core/types';
import { registerExactEvmScheme } from '@x402/evm/exact/facilitator';
import {
  BEAM_RPC,
  ZERO_G_CHAIN_ID_BY_CAIP,
} from './beam-chain.config';
import {
  createBeamMultiChainFacilitatorSigner,
  facilitatorNetworkContext,
} from './multi-chain-signer';

function parseEnabledCaipNetworks(config: ConfigService): string[] {
  const listRaw = config.get<string>('X402_EVM_NETWORKS')?.trim();
  if (!listRaw) {
    return ['eip155:16661', 'eip155:16602'];
  }
  const parsed = listRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : ['eip155:16661', 'eip155:16602'];
}

function rpcUrlForCaip(config: ConfigService, caip: string): string {
  if (!ZERO_G_CHAIN_ID_BY_CAIP[caip]) {
    throw new Error(`Unknown CAIP network ${caip}`);
  }
  if (caip === 'eip155:16661') {
    const explicit = config.get<string>('OG_RPC_URL_MAINNET')?.trim();
    if (explicit) return explicit;
    return BEAM_RPC.mainnet;
  }
  if (caip === 'eip155:16602') {
    const explicit = config.get<string>('OG_RPC_URL_TESTNET')?.trim();
    if (explicit) return explicit;
    return BEAM_RPC.testnet;
  }
  throw new Error(`Unsupported CAIP network ${caip}`);
}

@Injectable()
export class AppService implements OnModuleInit {
  private facilitator!: x402Facilitator;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const pk = this.configService.getOrThrow<string>('PRIVATE_KEY').trim();
    const enabled = parseEnabledCaipNetworks(this.configService);

    for (const caip of enabled) {
      if (!ZERO_G_CHAIN_ID_BY_CAIP[caip]) {
        throw new Error(
          `Unsupported network ${caip}. Supported: ${Object.keys(ZERO_G_CHAIN_ID_BY_CAIP).join(', ')} (0G mainnet / testnet).`,
        );
      }
    }

    const networkClients = enabled.map((caip) => ({
      caip2: caip,
      chainId: ZERO_G_CHAIN_ID_BY_CAIP[caip],
      rpcUrl: rpcUrlForCaip(this.configService, caip),
    }));

    const evmSigner = createBeamMultiChainFacilitatorSigner({
      privateKey: pk.startsWith('0x') ? pk : `0x${pk}`,
      networks: networkClients,
    });

    this.facilitator = new x402Facilitator();
    registerExactEvmScheme(this.facilitator, {
      signer: evmSigner,
      networks: enabled as Network[],
      deployERC4337WithEIP6492: true,
    });
  }

  getFacilitator(): x402Facilitator {
    return this.facilitator;
  }

  verifyPayment(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
  ): Promise<VerifyResponse> {
    return facilitatorNetworkContext.run(
      paymentRequirements.network,
      () => this.facilitator.verify(paymentPayload, paymentRequirements),
    );
  }

  settlePayment(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
  ): Promise<SettleResponse> {
    return facilitatorNetworkContext.run(
      paymentRequirements.network,
      () => this.facilitator.settle(paymentPayload, paymentRequirements),
    );
  }
}
