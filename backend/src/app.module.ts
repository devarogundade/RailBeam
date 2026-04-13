import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';
import { OgComputeService } from './og/og-compute.service';
import { OgStorageService } from './og/og-storage.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController, AgentsController],
  providers: [AppService, AgentsService, OgComputeService, OgStorageService],
})
export class AppModule {}
