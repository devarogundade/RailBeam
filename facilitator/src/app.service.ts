import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { x402Facilitator } from "@x402/core/facilitator";
import type {
  Network,
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from "@x402/core/types";
import { registerExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { createWalletClient, http, publicActions, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { zeroGMainnet } from "viem/chains";
import { Hex } from "viem";

const ZERO_G_BY_CAIP: Record<string, Chain> = {
  "eip155:16661": zeroGMainnet,
};

function chainForNetwork(caip: string): Chain {
  const chain = ZERO_G_BY_CAIP[caip];
  if (!chain) {
    throw new Error(
      `Unsupported X402_EVM_NETWORK=${caip}. Use eip155:16661 (0G mainnet).`,
    );
  }
  return chain;
}

@Injectable()
export class AppService implements OnModuleInit {
  private facilitator!: x402Facilitator;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const pk = this.configService.getOrThrow<string>("PRIVATE_KEY").trim();
    const network = this.configService
      .getOrThrow<string>("X402_EVM_NETWORK")
      .trim();

    const chain = chainForNetwork(network);
    const account = privateKeyToAccount(pk as Hex);

    const viemClient = createWalletClient({
      account,
      chain,
      transport: http(),
    }).extend(publicActions);

    const evmSigner = toFacilitatorEvmSigner({
      address: account.address,
      getCode: (args) => viemClient.getCode(args),
      readContract: (args) =>
        viemClient.readContract({
          ...args,
          args: args.args ?? [],
        }),
      verifyTypedData: (args) =>
        viemClient.verifyTypedData(
          args as Parameters<typeof viemClient.verifyTypedData>[0],
        ),
      writeContract: (args) =>
        viemClient.writeContract({
          ...args,
          args: args.args,
        }),
      sendTransaction: (args) => viemClient.sendTransaction(args),
      waitForTransactionReceipt: (args) =>
        viemClient.waitForTransactionReceipt(args),
    });

    this.facilitator = new x402Facilitator();
    registerExactEvmScheme(this.facilitator, {
      signer: evmSigner,
      networks: network as Network,
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
    return this.facilitator.verify(paymentPayload, paymentRequirements);
  }

  settlePayment(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
  ): Promise<SettleResponse> {
    return this.facilitator.settle(paymentPayload, paymentRequirements);
  }
}
