import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreditCardsModule } from '../credit-cards/credit-cards.module';
import { HandlersModule } from '../handlers/handlers.module';
import { StardormMongoModule } from '../mongo/stardorm-mongo.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [StardormMongoModule, AuthModule, HandlersModule, CreditCardsModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
