import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  resolveStardormChainAgentId,
  stardormChatSuccessSchema,
} from '../../../packages/stardorm-api-contract';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedWallet } from '../auth/jwt.strategy';
import { CurrentWallet } from '../auth/current-wallet.decorator';
import type { ChatTurnResult } from '../user/user.service';
import { UserService } from '../user/user.service';
import type { MulterIncomingFile } from '../user/multer-file.types';

const CHAT_MAX_FILES = 2;
const CHAT_MAX_FILE_BYTES = 5 * 1024 * 1024;

function mapChatToContract(
  agentKey: string,
  result: ChatTurnResult,
): ReturnType<typeof stardormChatSuccessSchema.parse> {
  const structured =
    result.structured &&
    'handler' in result.structured &&
    result.structured.handler
      ? {
          text: result.structured.text,
          handler: result.structured.handler,
          params: result.structured.params as unknown,
        }
      : result.structured
        ? { text: result.structured.text }
        : undefined;
  const attachments = result.attachments?.length
    ? result.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        mimeType: a.mimeType,
        hash: a.hash,
      }))
    : undefined;
  return stardormChatSuccessSchema.parse({
    agentKey,
    reply: result.content,
    structured,
    ...(result.structured?.rich ? { rich: result.structured.rich } : {}),
    ...(attachments ? { attachments } : {}),
    compute: {
      model: result.model,
      verified: result.verified,
      chatId: result.chatId,
      provider: result.provider,
      computeNetwork: result.computeNetwork,
    },
  });
}

@Controller('agents')
export class AgentsController {
  constructor(private readonly users: UserService) {}

  /**
   * Chat for clients. Accepts JSON `{ message }` or multipart form-data with
   * `message` + up to two `files` (uploaded to 0G Storage and attached to the
   * conversation). Resolves `agentKey` to its on-chain `agentId`.
   */
  @Post(':agentKey/chat')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', CHAT_MAX_FILES, {
      limits: { fileSize: CHAT_MAX_FILE_BYTES },
    }),
  )
  async chat(
    @CurrentWallet() wallet: AuthedWallet,
    @Param('agentKey') agentKey: string,
    @Body('message') message: unknown,
    @Body('conversationId') conversationId: unknown,
    @UploadedFiles() files?: MulterIncomingFile[],
  ) {
    const chainId = resolveStardormChainAgentId(agentKey);
    if (chainId == null) {
      throw new BadRequestException('Unknown agentKey');
    }
    const messageStr = typeof message === 'string' ? message : '';
    if (!messageStr.trim() && (!files || files.length === 0)) {
      throw new BadRequestException('message or at least one file is required');
    }
    try {
      const convId =
        typeof conversationId === 'string' ? conversationId.trim() : undefined;
      const result = await this.users.chat(
        wallet.walletAddress,
        agentKey.trim(),
        messageStr,
        files ?? [],
        convId || null,
      );
      return mapChatToContract(agentKey.trim(), result);
    } catch (e: unknown) {
      if (e instanceof HttpException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}
