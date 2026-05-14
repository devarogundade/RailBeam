import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  storageUploadBodySchema,
  storageUploadResponseSchema,
} from '@beam/stardorm-api-contract';
import { parseBody } from '../common/parse-body';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OgStorageService } from '../og/og-storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly ogStorage: OgStorageService) {}

  @Get(':rootHash')
  @Header('Cache-Control', 'public, max-age=3600')
  async getByRootHash(@Param('rootHash') rootHash: string) {
    try {
      const buffer = await this.ogStorage.getBytes(rootHash);
      return new StreamableFile(buffer, {
        type: 'application/octet-stream',
        disposition: `inline; filename="${rootHash}"`,
      });
    } catch (err) {
      console.error('Storage download failed', rootHash, err);
      throw new HttpException(
        'Storage download failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  async uploadString(@Body() raw: unknown) {
    const body = parseBody(storageUploadBodySchema, raw);
    try {
      return storageUploadResponseSchema.parse(
        await this.ogStorage.uploadString(body.content),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}
