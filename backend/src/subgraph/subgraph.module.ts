import { Global, Module } from '@nestjs/common';
import { SubgraphService } from './subgraph.service';

@Global()
@Module({
  providers: [SubgraphService],
  exports: [SubgraphService],
})
export class SubgraphModule {}
