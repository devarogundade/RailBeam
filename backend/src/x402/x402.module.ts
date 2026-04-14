import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OgStorageService } from '../og/og-storage.service';
import { X402Resource, X402ResourceSchema } from './schemas/x402-resource.schema';
import { X402Controller } from './x402.controller';
import { X402Service } from './x402.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: X402Resource.name, schema: X402ResourceSchema },
    ]),
  ],
  controllers: [X402Controller],
  providers: [X402Service, OgStorageService],
})
export class X402Module {}

