import { Body, Controller, Param, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Post(':agentId/chat')
  async chat(
    @Param('agentId') agentIdRaw: string,
    @Body()
    body: {
      message?: string;
      userAddress?: string;
      network?: string;
      providerAddress?: string;
    },
  ) {
    const agentId = Number(agentIdRaw);
    if (!Number.isFinite(agentId)) {
      return {
        type: 'text',
        content: 'Invalid agentId',
        error: 'agentId must be a number',
      };
    }
    const message = body?.message?.trim();
    if (!message) {
      return {
        type: 'text',
        content: 'Missing message',
        error: 'message required',
      };
    }
    return this.agents.chatWithAgent({
      agentId,
      message,
      network: body.network,
      userAddress: body.userAddress,
      providerAddress: body.providerAddress,
    });
  }

  @Post('metadata')
  async createEncryptedMetadata(
    @Body()
    body: {
      metadataValue: string;
    },
  ): Promise<{ rootHash: string; txHash: string }> {
    return this.agents.createEncryptedMetadata({
      metadataValue: body.metadataValue,
    });
  }
}
