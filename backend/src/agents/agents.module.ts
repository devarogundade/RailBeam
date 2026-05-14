import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AgentsController } from './agents.controller';

@Module({
  imports: [UserModule],
  controllers: [AgentsController],
})
export class AgentsModule {}
