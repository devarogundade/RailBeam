import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { CreateX402FileMetaDto, CreateX402LinkDto } from './dto/create-x402-resource.dto';
import { X402Service } from './x402.service';
import type { X402UploadedFile } from './x402-upload.types';

const validateBody = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller('resource')
export class X402Controller {
  constructor(private readonly x402: X402Service) {}

  /** Create a paid link resource: encrypts URL, uploads ciphertext to 0G, stores metadata. */
  @Post('link')
  @UsePipes(validateBody)
  async createLink(@Body() body: CreateX402LinkDto) {
    return this.x402.createLink(body);
  }

  /** Create a paid file resource: multipart field `file` plus pricing metadata in the body. */
  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @UsePipes(validateBody)
  async uploadFile(
    @UploadedFile() file: X402UploadedFile,
    @Body() body: CreateX402FileMetaDto,
  ) {
    return this.x402.createFile(file, body);
  }

  /** Public metadata: amount, currency, rootHash, payTo, kind, etc. (no decrypted secret). */
  @Get('view/:id')
  async view(@Param('id') id: string) {
    return this.x402.getView(id);
  }

  /**
   * Paid access: 402 + PAYMENT-REQUIRED without payment; with PAYMENT-SIGNATURE (or X-PAYMENT)
   * returns decrypted link as JSON or raw file bytes + PAYMENT-RESPONSE.
   */
  @Get('pay/:id')
  async pay(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const proto = req.protocol;
    const host = req.get('host') ?? 'localhost';
    const path = req.originalUrl?.split('?')[0] ?? `/resource/pay/${id}`;
    const resourceUrl = `${proto}://${host}${path}`;

    const result = await this.x402.pay(id, req, resourceUrl);

    if (result.status === 402) {
      res.status(402);
      res.setHeader('PAYMENT-REQUIRED', result.paymentRequiredHeader);
      res.setHeader('Content-Type', 'application/json');
      return res.json(result.body);
    }

    if (result.status === 400 || result.status === 403) {
      res.status(result.status);
      res.setHeader('Content-Type', 'application/json');
      return res.json(result.body);
    }

    res.status(200);
    res.setHeader('PAYMENT-RESPONSE', result.paymentResponseHeader);

    if (result.kind === 'link') {
      res.setHeader('Content-Type', 'application/json');
      return res.json({ kind: 'link', link: result.link });
    }

    res.setHeader('Content-Type', result.mimeType);
    if (result.filename) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename.replace(/"/g, '')}"`,
      );
    }
    return res.send(result.buffer);
  }
}
