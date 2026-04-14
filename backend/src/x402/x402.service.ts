import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  HTTPFacilitatorClient,
  x402ResourceServer,
  type ResourceConfig,
} from '@x402/core/server';
import type { PaymentPayload, ResourceInfo } from '@x402/core/types';
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
} from '@x402/core/http';
import { registerExactEvmScheme } from '@x402/evm/exact/server';
import {
  decryptBytesFromSealedEnvelopeJson,
  decryptString,
  encryptBytesToSealedEnvelopeJson,
  encryptString,
} from '../crypto/seal';
import { OgStorageService } from '../og/og-storage.service';
import {
  X402Resource,
  X402ResourceDocument,
} from './schemas/x402-resource.schema';
import type {
  CreateX402FileMetaDto,
  CreateX402LinkDto,
} from './dto/create-x402-resource.dto';
import type { X402UploadedFile } from './x402-upload.types';

export type X402ResourceView = {
  id: string;
  kind: 'file' | 'link';
  assetAmount: {
    asset: string;
    amount: number;
    extra?: Record<string, unknown>;
  };
  currency: string;
  network: string;
  payTo: string;
  rootHash: string;
  filename?: string;
  mimeType?: string;
  title?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function isAllowedKind(kind: string): kind is 'file' | 'link' {
  return kind === 'file' || kind === 'link';
}

function extractPaymentPayload(req: {
  headers: Record<string, string | string[] | undefined>;
}): PaymentPayload | null {
  const raw =
    (typeof req.headers['payment-signature'] === 'string'
      ? req.headers['payment-signature']
      : undefined) ??
    (typeof req.headers['PAYMENT-SIGNATURE'] === 'string'
      ? req.headers['PAYMENT-SIGNATURE']
      : undefined) ??
    (typeof req.headers['x-payment'] === 'string'
      ? req.headers['x-payment']
      : undefined) ??
    (typeof req.headers['X-PAYMENT'] === 'string'
      ? req.headers['X-PAYMENT']
      : undefined);
  if (!raw?.trim()) return null;
  try {
    return decodePaymentSignatureHeader(raw.trim());
  } catch {
    return null;
  }
}

@Injectable()
export class X402Service implements OnModuleInit {
  private resourceServer!: x402ResourceServer;

  constructor(
    @InjectModel(X402Resource.name)
    private readonly resourceModel: Model<X402ResourceDocument>,
    private readonly config: ConfigService,
    private readonly og: OgStorageService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('X402_FACILITATOR_URL')?.trim();
    const facilitator = new HTTPFacilitatorClient({ url });
    this.resourceServer = new x402ResourceServer(facilitator);
    registerExactEvmScheme(this.resourceServer, {});
    await this.resourceServer.initialize();
  }

  private pk(): string {
    return this.config.get<string>('PRIVATE_KEY') ?? '';
  }

  private toView(doc: X402ResourceDocument): X402ResourceView {
    return {
      id: String(doc._id),
      kind: doc.kind,
      assetAmount: {
        asset: doc.assetAmount.asset,
        amount: doc.assetAmount.amount,
        ...(doc.assetAmount.extra ? { extra: doc.assetAmount.extra } : {}),
      },
      currency: doc.currency,
      network: doc.network,
      payTo: doc.payTo,
      rootHash: doc.rootHash,
      filename: doc.filename,
      mimeType: doc.mimeType,
      title: doc.title,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async createLink(dto: CreateX402LinkDto): Promise<X402ResourceView> {
    const pk = this.pk();
    if (!pk.trim()) {
      throw new BadRequestException('PRIVATE_KEY is not configured');
    }
    const sealed = encryptString(dto.link, pk);
    const { rootHash } = await this.og.uploadString(sealed);
    const doc = await this.resourceModel.create({
      kind: 'link',
      assetAmount: {
        asset: dto.asset,
        amount: dto.amount,
      },
      currency: dto.currency,
      network: dto.network,
      payTo: dto.payTo,
      rootHash,
      title: dto.title,
    });
    return this.toView(doc);
  }

  async createFile(
    file: X402UploadedFile | undefined,
    meta: CreateX402FileMetaDto,
  ): Promise<X402ResourceView> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }
    const pk = this.pk();
    if (!pk.trim()) {
      throw new BadRequestException('PRIVATE_KEY is not configured');
    }
    const sealed = encryptBytesToSealedEnvelopeJson(file.buffer, pk);
    const { rootHash } = await this.og.uploadString(sealed);
    const doc = await this.resourceModel.create({
      kind: 'file',
      assetAmount: {
        asset: meta.asset,
        amount: meta.amount,
      },
      currency: meta.currency,
      network: meta.network,
      payTo: meta.payTo,
      rootHash,
      title: meta.title,
      filename:
        file.originalname?.replace(/[^\w.\-()+@ ]/g, '_') || 'upload.bin',
      mimeType: file.mimetype || 'application/octet-stream',
    });
    return this.toView(doc);
  }

  async getView(id: string): Promise<X402ResourceView> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Resource not found');
    }
    const doc = await this.resourceModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Resource not found');
    if (!isAllowedKind(doc.kind)) {
      throw new BadRequestException('Resource kind must be file or link');
    }
    return this.toView(doc);
  }

  private resourceConfig(doc: X402ResourceDocument): ResourceConfig {
    return {
      scheme: 'exact',
      payTo: doc.payTo,
      price: {
        asset: doc.assetAmount.asset,
        amount: doc.assetAmount.amount.toString(),
      },
      network: doc.network,
      maxTimeoutSeconds: 600,
    };
  }

  private resourceInfo(
    doc: X402ResourceDocument,
    resourceUrl: string,
  ): ResourceInfo {
    const mime =
      doc.kind === 'file'
        ? (doc.mimeType ?? 'application/octet-stream')
        : 'application/json';
    return {
      url: resourceUrl,
      description: doc.title ?? `Paid resource (${doc.kind})`,
      mimeType: mime,
    };
  }

  /**
   * x402: without payment header returns 402 + PAYMENT-REQUIRED;
   * with valid payment verifies, settles, returns decrypted link (JSON) or file bytes.
   */
  async pay(
    id: string,
    req: { headers: Record<string, string | string[] | undefined> },
    resourceUrl: string,
  ): Promise<
    | {
        status: 402;
        paymentRequiredHeader: string;
        body: Record<string, unknown>;
      }
    | { status: 400; body: Record<string, unknown> }
    | { status: 403; body: Record<string, unknown> }
    | {
        status: 200;
        paymentResponseHeader: string;
        kind: 'link';
        link: string;
      }
    | {
        status: 200;
        paymentResponseHeader: string;
        kind: 'file';
        buffer: Buffer;
        mimeType: string;
        filename?: string;
      }
  > {
    if (!Types.ObjectId.isValid(id)) {
      return { status: 400, body: { error: 'Invalid resource id' } };
    }
    const doc = await this.resourceModel.findById(id).exec();
    if (!doc) {
      return { status: 400, body: { error: 'Resource not found' } };
    }
    if (!isAllowedKind(doc.kind)) {
      return {
        status: 400,
        body: { error: 'Resource kind must be file or link' },
      };
    }

    const cfg = this.resourceConfig(doc);
    const info = this.resourceInfo(doc, resourceUrl);
    const paymentPayload = extractPaymentPayload(req);

    const processed = await this.resourceServer.processPaymentRequest(
      paymentPayload,
      cfg,
      info,
    );

    if (!processed.success) {
      if (processed.requiresPayment) {
        return {
          status: 402,
          paymentRequiredHeader: encodePaymentRequiredHeader(
            processed.requiresPayment,
          ),
          body: {},
        };
      }
      if (
        processed.verificationResult &&
        !processed.verificationResult.isValid
      ) {
        return {
          status: 403,
          body: {
            error:
              processed.verificationResult.invalidReason ?? 'verify_failed',
            message: processed.verificationResult.invalidMessage,
          },
        };
      }
      return {
        status: 400,
        body: { error: processed.error ?? 'payment_failed' },
      };
    }

    const requirements =
      await this.resourceServer.buildPaymentRequirements(cfg);
    const matching = this.resourceServer.findMatchingRequirements(
      requirements,
      paymentPayload!,
    );
    if (!matching) {
      return { status: 400, body: { error: 'no_matching_requirements' } };
    }

    let settle;
    try {
      settle = await this.resourceServer.settlePayment(
        paymentPayload!,
        matching,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new ServiceUnavailableException(`Settlement failed: ${msg}`);
    }

    if (!settle.success) {
      return {
        status: 403,
        body: {
          error: settle.errorReason ?? 'settle_failed',
          message: settle.errorMessage,
        },
      };
    }

    const pk = this.pk();
    const sealed = await this.og.getString(doc.rootHash);

    if (doc.kind === 'link') {
      const link = decryptString(sealed, pk);
      return {
        status: 200,
        paymentResponseHeader: encodePaymentResponseHeader(settle),
        kind: 'link',
        link,
      };
    }

    const buffer = decryptBytesFromSealedEnvelopeJson(sealed, pk);
    return {
      status: 200,
      paymentResponseHeader: encodePaymentResponseHeader(settle),
      kind: 'file',
      buffer,
      mimeType: doc.mimeType ?? 'application/octet-stream',
      filename: doc.filename,
    };
  }
}
