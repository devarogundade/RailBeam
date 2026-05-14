import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StardormMongoModule } from './mongo/stardorm-mongo.module';
import { OgModule } from './og/og.module';
import { StorageModule } from './storage/storage.module';
import { SubgraphModule } from './subgraph/subgraph.module';
import { UserModule } from './user/user.module';
import { HandlersModule } from './handlers/handlers.module';
import { AgentsModule } from './agents/agents.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OgModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    StardormMongoModule,
    AuthModule,
    SubgraphModule,
    StorageModule,
    UserModule,
    HandlersModule,
    AgentsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
