import { Global, Module } from '@nestjs/common';
import { CoinmarketcapPriceService } from './coinmarketcap-price.service';

@Global()
@Module({
  providers: [CoinmarketcapPriceService],
  exports: [CoinmarketcapPriceService],
})
export class PricingModule {}
