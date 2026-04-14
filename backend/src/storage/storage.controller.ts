import {
  BadRequestException,
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Param,
  StreamableFile,
} from '@nestjs/common';
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
}
