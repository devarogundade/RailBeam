import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';
import { AuthModule } from './auth/auth.module';
import { IssuingModule } from './issuing/issuing.module';
import { OgComputeService } from './og/og-compute.service';
import { OgStorageService } from './og/og-storage.service';
import { RedisModule } from './redis/redis.module';
import { StorageController } from './storage/storage.controller';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { X402Module } from './x402/x402.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    RedisModule,
    UsersModule,
    AuthModule,
    IssuingModule,
    TransactionsModule,
    X402Module,
  ],
  controllers: [AppController, AgentsController, StorageController],
  providers: [AppService, AgentsService, OgComputeService, OgStorageService],
})
export class AppModule {}
