import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
} from '@x402/core/types';
import {
  PaymentPayloadSchema,
  PaymentRequirementsSchema,
} from '@x402/core/schemas';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/verify')
  getVerifyInfo(@Res() res: Response) {
    return res.json({
      endpoint: '/verify',
      description: 'POST to verify x402 payments',
      body: {
        paymentPayload: 'PaymentPayload',
        paymentRequirements: 'PaymentRequirements',
      },
    });
  }

  @Post('/verify')
  async verify(@Body() body: unknown, @Res() res: Response) {
    try {
      const parsed = body as {
        paymentPayload?: unknown;
        paymentRequirements?: unknown;
      };
      if (!parsed.paymentPayload || !parsed.paymentRequirements) {
        return res.status(400).json({
          error: 'Missing paymentPayload or paymentRequirements',
        });
      }
      const paymentRequirements = PaymentRequirementsSchema.parse(
        parsed.paymentRequirements,
      );
      const paymentPayload = PaymentPayloadSchema.parse(parsed.paymentPayload);

      const response = await this.appService.verifyPayment(
        paymentPayload as PaymentPayload,
        paymentRequirements as PaymentRequirements,
      );
      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Verify error:', error);
      return res.status(500).json({ error: message });
    }
  }

  @Get('/settle')
  getSettleInfo(@Res() res: Response) {
    return res.json({
      endpoint: '/settle',
      description: 'POST to settle x402 payments',
      body: {
        paymentPayload: 'PaymentPayload',
        paymentRequirements: 'PaymentRequirements',
      },
    });
  }

  @Post('/settle')
  async settle(@Body() body: unknown, @Res() res: Response) {
    try {
      const parsed = body as {
        paymentPayload?: unknown;
        paymentRequirements?: unknown;
      };
      if (!parsed.paymentPayload || !parsed.paymentRequirements) {
        return res.status(400).json({
          error: 'Missing paymentPayload or paymentRequirements',
        });
      }
      const paymentRequirements = PaymentRequirementsSchema.parse(
        parsed.paymentRequirements,
      );
      const paymentPayload = PaymentPayloadSchema.parse(parsed.paymentPayload);

      const response = await this.appService.settlePayment(
        paymentPayload as PaymentPayload,
        paymentRequirements as PaymentRequirements,
      );
      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Settle error:', error);
      if (
        error instanceof Error &&
        error.message.includes('Settlement aborted:')
      ) {
        const payload = body as {
          paymentPayload?: { network?: string };
        };
        return res.json({
          success: false,
          errorReason: error.message.replace('Settlement aborted: ', ''),
          network: payload.paymentPayload?.network ?? 'unknown',
        } as SettleResponse);
      }
      return res.status(500).json({ error: message });
    }
  }

  @Get('/supported')
  supported(@Res() res: Response) {
    try {
      const response = this.appService.getFacilitator().getSupported();
      return res.json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Supported error:', error);
      return res.status(500).json({ error: message });
    }
  }
}
