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
      previousMessages?: Array<{
        role?: 'user' | 'assistant';
        content?: string;
      }>;
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
      previousMessages: body.previousMessages,
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

  @Post(':agentId/knowledgebase')
  async updateKnowledgebase(
    @Param('agentId') agentIdRaw: string,
    @Body() body: { knowledgebaseHtml: string },
  ): Promise<{ rootHash: string; txHash: string; metadataValue: string }> {
    const agentId = Number(agentIdRaw);
    if (!Number.isFinite(agentId)) {
      return {
        rootHash: '',
        txHash: '',
        metadataValue: 'Invalid agentId',
      };
    }
    return this.agents.updateAgentKnowledgebase({
      agentId,
      knowledgebaseHtml: body.knowledgebaseHtml,
    });
  }
}
