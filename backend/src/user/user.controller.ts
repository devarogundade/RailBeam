import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedWallet } from '../auth/jwt.strategy';
import { CurrentWallet } from '../auth/current-wallet.decorator';
import { parseBody } from '../common/parse-body';
import { parseQuery, parseQueryRecord } from '../common/parse-query';
import type { MulterIncomingFile } from './multer-file.types';
import { UserService } from './user.service';
import { parseClientEvmChainIdHeader } from '../beam/beam-evm-chain';
import {
  chatHistoryQuerySchema,
  chatHistoryResponseSchema,
  conversationSummarySchema,
  conversationsPageResponseSchema,
  conversationsQuerySchema,
  createConversationBodySchema,
  deleteConversationResponseSchema,
  creditCardFundBodySchema,
  creditCardFundQuoteQuerySchema,
  creditCardFundQuoteResponseSchema,
  creditCardPublicSchema,
  creditCardSensitiveDetailsSchema,
  creditCardsListResponseSchema,
  creditCardWithdrawBodySchema,
  executeHandlerBodySchema,
  executeHandlerResponseSchema,
  meOnRampsQuerySchema,
  mePaymentRequestsQuerySchema,
  onRampsListResponseSchema,
  paymentRequestsListResponseSchema,
  publicUserSchema,
  updateUserBodySchema,
  userUploadResultSchema,
  userKycStatusDocumentSchema,
} from '@beam/stardorm-api-contract';

const USER_UPLOAD_MAX_FILE_BYTES = 5 * 1024 * 1024;
const CHAT_MAX_FILES = 2;

@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentWallet() wallet: AuthedWallet) {
    return publicUserSchema.parse(await this.users.getMe(wallet.walletAddress));
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/files')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: USER_UPLOAD_MAX_FILE_BYTES },
    }),
  )
  async uploadMeFile(
    @CurrentWallet() wallet: AuthedWallet,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: USER_UPLOAD_MAX_FILE_BYTES }),
        ],
      }),
    )
    file: MulterIncomingFile,
  ) {
    try {
      return userUploadResultSchema.parse(
        await this.users.uploadMeFile(wallet.walletAddress, file),
      );
    } catch (e: unknown) {
      if (e instanceof HttpException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@CurrentWallet() wallet: AuthedWallet, @Body() raw: unknown) {
    const body = parseBody(updateUserBodySchema, raw);
    return publicUserSchema.parse(
      await this.users.updateUser(wallet.walletAddress, body),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/conversations')
  async listConversations(
    @CurrentWallet() wallet: AuthedWallet,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    const q = parseQuery(conversationsQuerySchema, parseQueryRecord(query));
    return conversationsPageResponseSchema.parse(
      await this.users.listConversations(
        wallet.walletAddress,
        q.limit,
        q.cursor,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/conversations')
  async createConversation(
    @CurrentWallet() wallet: AuthedWallet,
    @Body() raw: unknown,
  ) {
    const body = parseBody(createConversationBodySchema, raw);
    return conversationSummarySchema.parse(
      await this.users.createConversation(wallet.walletAddress, body),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/conversations/:conversationId')
  async deleteConversation(
    @CurrentWallet() wallet: AuthedWallet,
    @Param('conversationId') conversationId: string,
  ) {
    await this.users.deleteConversation(
      wallet.walletAddress,
      conversationId.trim(),
    );
    return deleteConversationResponseSchema.parse({ deleted: true });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/chat/messages')
  async chatMessages(
    @CurrentWallet() wallet: AuthedWallet,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    const q = parseQuery(chatHistoryQuerySchema, parseQueryRecord(query));
    return chatHistoryResponseSchema.parse(
      await this.users.listChatMessages(
        wallet.walletAddress,
        q.limit,
        q.conversationId,
        q.cursor,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/credit-cards')
  async listCreditCards(@CurrentWallet() wallet: AuthedWallet) {
    return creditCardsListResponseSchema.parse(
      await this.users.listMyCreditCards(wallet.walletAddress),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/credit-cards/fund-quote')
  async creditCardFundQuote(
    @Query() query: Record<string, string | string[] | undefined>,
    @Headers('x-beam-chain-id') beamChainHeader: string | undefined,
  ) {
    const q = parseQuery(
      creditCardFundQuoteQuerySchema,
      parseQueryRecord(query),
    );
    const chainId = parseClientEvmChainIdHeader(beamChainHeader);
    return creditCardFundQuoteResponseSchema.parse(
      await this.users.getCreditCardFundQuote(q.amountCents, chainId),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/credit-cards/:cardId/details')
  async getCreditCardSensitiveDetails(
    @CurrentWallet() wallet: AuthedWallet,
    @Param('cardId') cardId: string,
  ) {
    return creditCardSensitiveDetailsSchema.parse(
      await this.users.getMyCreditCardSensitiveDetails(
        wallet.walletAddress,
        cardId.trim(),
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/payment-requests')
  async listMyPaymentRequests(
    @CurrentWallet() wallet: AuthedWallet,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    const q = parseQuery(
      mePaymentRequestsQuerySchema,
      parseQueryRecord(query),
    );
    return paymentRequestsListResponseSchema.parse(
      await this.users.listMyPaymentRequests(wallet.walletAddress, q.limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/on-ramps')
  async listMyOnRamps(
    @CurrentWallet() wallet: AuthedWallet,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    const q = parseQuery(meOnRampsQuerySchema, parseQueryRecord(query));
    return onRampsListResponseSchema.parse(
      await this.users.listMyOnRamps(wallet.walletAddress, q.limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/kyc-status')
  async getMyKycStatus(@CurrentWallet() wallet: AuthedWallet) {
    return userKycStatusDocumentSchema.parse(
      await this.users.getMyKycStatus(wallet.walletAddress),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/credit-cards/:cardId/fund')
  async fundCreditCard(
    @CurrentWallet() wallet: AuthedWallet,
    @Param('cardId') cardId: string,
    @Body() raw: unknown,
    @Headers('x-beam-chain-id') beamChainHeader: string | undefined,
  ) {
    const body = parseBody(creditCardFundBodySchema, raw);
    const clientEvmChainId = parseClientEvmChainIdHeader(beamChainHeader);
    return creditCardPublicSchema.parse(
      await this.users.fundMyCreditCard(
        wallet.walletAddress,
        cardId.trim(),
        body,
        clientEvmChainId,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/credit-cards/:cardId/withdraw')
  async withdrawCreditCard(
    @CurrentWallet() wallet: AuthedWallet,
    @Param('cardId') cardId: string,
    @Body() raw: unknown,
    @Headers('x-beam-chain-id') beamChainHeader: string | undefined,
  ) {
    const body = parseBody(creditCardWithdrawBodySchema, raw);
    const clientEvmChainId = parseClientEvmChainIdHeader(beamChainHeader);
    return creditCardPublicSchema.parse(
      await this.users.withdrawMyCreditCard(
        wallet.walletAddress,
        cardId.trim(),
        body.amountCents,
        clientEvmChainId,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/chat/execute-handler')
  async executeHandler(
    @CurrentWallet() wallet: AuthedWallet,
    @Body() raw: unknown,
    @Headers('x-beam-chain-id') beamChainHeader: string | undefined,
  ) {
    const body = parseBody(executeHandlerBodySchema, raw);
    const clientEvmChainId = parseClientEvmChainIdHeader(beamChainHeader);
    return executeHandlerResponseSchema.parse(
      await this.users.executeHandler(wallet.walletAddress, {
        handler: body.handler,
        params: body.params,
        ctaMessageId: body.ctaMessageId,
      }, clientEvmChainId),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/chat')
  @UseInterceptors(
    FilesInterceptor('files', CHAT_MAX_FILES, {
      limits: { fileSize: USER_UPLOAD_MAX_FILE_BYTES },
    }),
  )
  async chat(
    @CurrentWallet() wallet: AuthedWallet,
    @Body('message') message: unknown,
    @Body('agentId') agentId: unknown,
    @Body('conversationId') conversationId: unknown,
    @UploadedFiles() files?: MulterIncomingFile[],
    @Headers('x-beam-chain-id') beamChainHeader?: string,
  ) {
    try {
      const clientEvmChainId = parseClientEvmChainIdHeader(beamChainHeader);
      if (agentId === undefined || agentId === null) {
        throw new BadRequestException('agentId required');
      }
      const aid =
        typeof agentId === 'bigint'
          ? agentId
          : typeof agentId === 'number'
            ? agentId
            : typeof agentId === 'string'
              ? agentId.trim()
              : null;
      if (aid === null || aid === '') {
        throw new BadRequestException('agentId required');
      }
      const messageStr = typeof message === 'string' ? message : '';
      const convId =
        typeof conversationId === 'string' ? conversationId.trim() : undefined;
      return await this.users.chat(
        wallet.walletAddress,
        aid,
        messageStr,
        files ?? [],
        convId || null,
        clientEvmChainId,
      );
    } catch (e: unknown) {
      if (e instanceof HttpException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}
