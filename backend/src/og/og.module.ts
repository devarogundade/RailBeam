import { Global, Module } from '@nestjs/common';
import { OgComputeService } from './og-compute.service';
import { OgStorageService } from './og-storage.service';

@Global()
@Module({
  providers: [OgComputeService, OgStorageService],
  exports: [OgComputeService, OgStorageService],
})
export class OgModule {}
