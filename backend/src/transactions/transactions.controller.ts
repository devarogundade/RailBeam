import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsService } from './transactions.service';

const validateBody = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller('transaction')
export class TransactionsController {
  constructor(private readonly tx: TransactionsService) {}

  @Post('create')
  @UsePipes(validateBody)
  async create(@Body() body: CreateTransactionDto) {
    return this.tx.create(body);
  }

  @Get('view/:id')
  async view(@Param('id') id: string) {
    return this.tx.view(id);
  }
}

