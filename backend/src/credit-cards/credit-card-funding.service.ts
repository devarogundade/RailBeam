import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JsonRpcProvider, Wallet } from 'ethers';
import { OG_NATIVE, activeOgRpcUrl } from '../og/beam-og.config';
import { Model } from 'mongoose';
import {
  BEAM_EVM_CHAIN_IDS,
  beamEvmTierFromChainId,
} from '../beam/beam-evm-chain';
import {
  BEAM_USDC_E_ADDRESS,
  BEAM_USDC_E_DECIMALS,
  usdcBaseUnitsFromUsdCents,
} from '../beam/beam-usdc-e.config';
import { CreditCardFundTx } from '../mongo/schemas/credit-card-fund-tx.schema';
import { X402FacilitatorService } from '../payments/x402-facilitator.service';

function assertEvmAddress(raw: string): `0x${string}` {
  const a = raw.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) {
    throw new BadRequestException('Invalid EVM address');
  }
  return a as `0x${string}`;
}

/** floor(amountCents * 10^18 / (100 * usdPerWholeNative)) — treasury payout on unfund. */
export function nativeWeiFromUsdCentsFloor(
  amountCents: number,
  usdPerWholeNative: number,
): bigint {
  if (!Number.isFinite(usdPerWholeNative) || usdPerWholeNative <= 0) {
    throw new BadRequestException('Invalid native USD reference');
  }
  const microUsd = BigInt(amountCents) * 10_000n;
  const usdMicroPerNative = BigInt(Math.round(usdPerWholeNative * 1_000_000));
  if (usdMicroPerNative <= 0n) {
    throw new BadRequestException('Invalid native USD reference');
  }
  return (microUsd * 10n ** 18n) / usdMicroPerNative;
}

export type CreditCardFundQuoteX402 = {
  onchainFundingRequired: false;
  chainId: number;
  recipient: `0x${string}`;
  usdcAsset: string;
  usdcAmountBaseUnits: string;
  usdcDecimals: number;
};

export type CreditCardFundQuoteNative = {
  onchainFundingRequired: true;
  chainId: number;
  recipient: `0x${string}`;
  minNativeWei: string;
  usdValue: number;
  nativeSymbol: string;
  nativeDecimals: number;
};

export type CreditCardFundQuote =
  | CreditCardFundQuoteX402
  | CreditCardFundQuoteNative;

/** ceil(amountCents * 10^18 / (100 * usdPerWholeNative)) using integer micro-USD math. */
export function minNativeWeiFromUsdCents(
  amountCents: number,
  usdPerWholeNative: number,
): bigint {
  if (!Number.isFinite(usdPerWholeNative) || usdPerWholeNative <= 0) {
    throw new BadRequestException('Invalid native USD reference');
  }
  const microUsd = BigInt(amountCents) * 10_000n;
  const usdMicroPerNative = BigInt(Math.round(usdPerWholeNative * 1_000_000));
  if (usdMicroPerNative <= 0n) {
    throw new BadRequestException('Invalid native USD reference');
  }
  return (microUsd * 10n ** 18n + usdMicroPerNative - 1n) / usdMicroPerNative;
}

@Injectable()
export class CreditCardFundingService {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(CreditCardFundTx.name)
    private readonly fundTxModel: Model<CreditCardFundTx>,
    private readonly x402Facilitator: X402FacilitatorService,
  ) {}

  getFundRecipient(): `0x${string}` | undefined {
    const raw = this.config.get<string>('CREDIT_CARD_FUND_RECIPIENT')?.trim();
    if (!raw) return undefined;
    return assertEvmAddress(raw);
  }

  private treasuryPrivateKey(): string | undefined {
    const pk = this.config.get<string>('CREDIT_CARD_TREASURY_PRIVATE_KEY')?.trim();
    return pk || undefined;
  }

  /** Native return to the user wallet after unfund (requires treasury key + fund recipient). */
  isOnchainUnfundPayoutConfigured(): boolean {
    const rec = this.getFundRecipient();
    const pk = this.treasuryPrivateKey();
    if (!rec || !pk) return false;
    try {
      return new Wallet(pk).address.toLowerCase() === rec;
    } catch {
      return false;
    }
  }

  isX402FundingConfigured(): boolean {
    return Boolean(this.getFundRecipient() && this.x402Facilitator.isConfigured());
  }

  quote(
    amountCents: number,
    clientEvmChainId?: number,
  ): CreditCardFundQuote {
    const recipient = this.getFundRecipient();
    if (!recipient) {
      throw new ServiceUnavailableException(
        'Card funding requires CREDIT_CARD_FUND_RECIPIENT to be configured.',
      );
    }

    if (this.isX402FundingConfigured()) {
      return {
        onchainFundingRequired: false,
        chainId: BEAM_EVM_CHAIN_IDS.mainnet,
        recipient,
        usdcAsset: BEAM_USDC_E_ADDRESS,
        usdcAmountBaseUnits: usdcBaseUnitsFromUsdCents(amountCents),
        usdcDecimals: BEAM_USDC_E_DECIMALS,
      };
    }

    const tier = beamEvmTierFromChainId(clientEvmChainId);
    if (!tier) {
      throw new BadRequestException(
        'Set your Beam / 0G network in the app (or send X-Beam-Chain-Id) to quote on-chain card funding.',
      );
    }
    const native = OG_NATIVE[tier];
    const usdValue = native.usdValue;
    if (usdValue == null || !Number.isFinite(usdValue) || usdValue <= 0) {
      throw new ServiceUnavailableException(
        'Native USD reference is not configured for this network.',
      );
    }
    const minNativeWei = minNativeWeiFromUsdCents(amountCents, usdValue);
    if (minNativeWei <= 0n) {
      throw new BadRequestException(
        'Fund amount is too small for an on-chain native payment',
      );
    }
    return {
      onchainFundingRequired: true,
      chainId: clientEvmChainId!,
      recipient,
      minNativeWei: minNativeWei.toString(),
      usdValue,
      nativeSymbol: native.symbol,
      nativeDecimals: native.decimals,
    };
  }

  /**
   * Reserves a facilitator settlement tx hash so it cannot fund two cards.
   */
  async lockFundSettlementTx(input: {
    walletAddress: string;
    txHash: string;
  }): Promise<() => Promise<void>> {
    const txHash = input.txHash.trim().toLowerCase();
    if (!/^0x[a-f0-9]{64}$/.test(txHash)) {
      throw new BadRequestException('Invalid settlement transaction hash');
    }
    const wallet = input.walletAddress.trim().toLowerCase();

    const claim = await this.fundTxModel.updateOne(
      { txHash },
      { $setOnInsert: { txHash, walletAddress: wallet } },
      { upsert: true },
    );
    if (claim.upsertedCount !== 1) {
      throw new ConflictException(
        'This transaction was already used to fund a card',
      );
    }

    return async () => {
      await this.fundTxModel.deleteOne({ txHash }).catch(() => {
        /* best-effort rollback */
      });
    };
  }

  /**
   * Sends native 0G from the treasury wallet to the user's wallet. Caller must have
   * already reduced the virtual card balance; on failure they should restore balance.
   */
  async payoutUnfundNative(input: {
    userWallet: string;
    amountCents: number;
    chainId: number;
  }): Promise<{ txHash: string }> {
    const recipientCfg = this.getFundRecipient();
    const pk = this.treasuryPrivateKey();
    if (!recipientCfg || !pk) {
      throw new ServiceUnavailableException(
        'Virtual card unfund payout is not configured (set CREDIT_CARD_FUND_RECIPIENT and CREDIT_CARD_TREASURY_PRIVATE_KEY).',
      );
    }
    let signerAddr: string;
    try {
      signerAddr = new Wallet(pk).address.toLowerCase();
    } catch {
      throw new BadRequestException('Invalid CREDIT_CARD_TREASURY_PRIVATE_KEY');
    }
    if (signerAddr !== recipientCfg) {
      throw new ServiceUnavailableException(
        'CREDIT_CARD_TREASURY_PRIVATE_KEY must control the CREDIT_CARD_FUND_RECIPIENT address.',
      );
    }
    const tier = beamEvmTierFromChainId(input.chainId);
    if (!tier) {
      throw new BadRequestException('Unsupported chain for card unfund payout');
    }
    const native = OG_NATIVE[tier];
    const usdValue = native.usdValue;
    if (usdValue == null || !Number.isFinite(usdValue) || usdValue <= 0) {
      throw new ServiceUnavailableException(
        'Native USD reference is not configured for this network.',
      );
    }
    const wei = nativeWeiFromUsdCentsFloor(input.amountCents, usdValue);
    if (wei <= 0n) {
      throw new BadRequestException(
        'Withdraw amount is too small for an on-chain native payout',
      );
    }
    const to = assertEvmAddress(input.userWallet);
    const rpc = activeOgRpcUrl(this.config);
    const provider = new JsonRpcProvider(rpc, input.chainId);
    const signer = new Wallet(pk, provider);
    const tx = await signer.sendTransaction({ to, value: wei });
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new BadRequestException('Unfund payout transaction failed');
    }
    return { txHash: receipt.hash.toLowerCase() };
  }
}
