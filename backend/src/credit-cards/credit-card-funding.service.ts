import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JsonRpcProvider, Wallet } from 'ethers';
import { Model } from 'mongoose';
import {
  BEAM_EVM_CHAIN_IDS,
  beamEvmTierFromChainId,
} from '../beam/beam-evm-chain';
import { CreditCardFundTx } from '../mongo/schemas/credit-card-fund-tx.schema';
import { OG_NATIVE, activeOgRpcUrl } from '../og/beam-og.config';

function assertEvmAddress(raw: string): `0x${string}` {
  const a = raw.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) {
    throw new BadRequestException('Invalid EVM address');
  }
  return a as `0x${string}`;
}

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

export type CreditCardFundQuoteOffChain = { onchainFundingRequired: false };

export type CreditCardFundQuoteOnChain = {
  onchainFundingRequired: true;
  chainId: number;
  recipient: `0x${string}`;
  minNativeWei: string;
  usdValue: number;
  nativeSymbol: string;
  nativeDecimals: number;
};

@Injectable()
export class CreditCardFundingService {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(CreditCardFundTx.name)
    private readonly fundTxModel: Model<CreditCardFundTx>,
  ) {}

  private fundRecipient(): `0x${string}` | undefined {
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
    const rec = this.fundRecipient();
    const pk = this.treasuryPrivateKey();
    if (!rec || !pk) return false;
    try {
      return new Wallet(pk).address.toLowerCase() === rec;
    } catch {
      return false;
    }
  }

  isOnchainFundingConfigured(): boolean {
    return Boolean(this.fundRecipient());
  }

  quote(
    amountCents: number,
    clientEvmChainId?: number,
  ): CreditCardFundQuoteOffChain | CreditCardFundQuoteOnChain {
    const recipient = this.fundRecipient();
    if (!recipient) {
      return { onchainFundingRequired: false };
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
    const chainId =
      tier === 'mainnet'
        ? BEAM_EVM_CHAIN_IDS.mainnet
        : BEAM_EVM_CHAIN_IDS.testnet;
    const minWei = minNativeWeiFromUsdCents(amountCents, usdValue);
    return {
      onchainFundingRequired: true,
      chainId,
      recipient,
      minNativeWei: minWei.toString(),
      usdValue,
      nativeSymbol: native.symbol,
      nativeDecimals: native.decimals,
    };
  }

  /**
   * Reserves `fundingTxHash` in Mongo, verifies the native transfer on RPC, and returns a rollback
   * that deletes the reservation if crediting the card fails afterward.
   */
  async lockAndVerifyFundingTx(input: {
    walletAddress: string;
    amountCents: number;
    fundingTxHash: string;
    fundingChainId: number;
  }): Promise<() => Promise<void>> {
    const recipient = this.fundRecipient();
    if (!recipient) {
      throw new BadRequestException('On-chain card funding is not configured');
    }
    const tier = beamEvmTierFromChainId(input.fundingChainId);
    if (!tier) {
      throw new BadRequestException('Unsupported chain for card funding');
    }
    const native = OG_NATIVE[tier];
    const usdValue = native.usdValue;
    if (usdValue == null || !Number.isFinite(usdValue) || usdValue <= 0) {
      throw new ServiceUnavailableException(
        'Native USD reference is not configured for this network.',
      );
    }
    const minWei = minNativeWeiFromUsdCents(input.amountCents, usdValue);
    const txHash = input.fundingTxHash.trim().toLowerCase();
    if (!/^0x[a-f0-9]{64}$/.test(txHash)) {
      throw new BadRequestException('Invalid fundingTxHash');
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

    const release = async () => {
      await this.fundTxModel.deleteOne({ txHash }).catch(() => {
        /* best-effort rollback */
      });
    };

    try {
      const rpc = activeOgRpcUrl(this.config);
      const provider = new JsonRpcProvider(rpc, input.fundingChainId);
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt || receipt.status !== 1) {
        throw new BadRequestException(
          'Funding transaction not found or not successful',
        );
      }
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        throw new BadRequestException('Funding transaction not found');
      }
      const from = tx.from?.toLowerCase();
      const to = tx.to?.toLowerCase();
      if (from !== wallet) {
        throw new BadRequestException(
          'Funding transaction sender does not match your wallet',
        );
      }
      if (to !== recipient) {
        throw new BadRequestException(
          'Funding transaction recipient does not match the configured treasury',
        );
      }
      if (tx.data && tx.data !== '0x') {
        throw new BadRequestException(
          'Only plain native transfers are accepted for card funding',
        );
      }
      if (tx.value < minWei) {
        throw new BadRequestException(
          `Funding amount too low for ${input.amountCents} cents at the current native USD reference (need at least ${minWei.toString()} wei)`,
        );
      }
    } catch (e) {
      await release();
      throw e;
    }

    return release;
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
    const recipientCfg = this.fundRecipient();
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
