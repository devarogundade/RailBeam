import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OgModule } from '../og/og.module';
import { StorageController } from './storage.controller';

@Module({
  imports: [OgModule, AuthModule],
  controllers: [StorageController],
})
export class StorageModule {}
