import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { IssuingController } from './issuing.controller';
import { IssuingService } from './issuing.service';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [IssuingController],
  providers: [IssuingService],
  exports: [IssuingService],
})
export class IssuingModule {}
