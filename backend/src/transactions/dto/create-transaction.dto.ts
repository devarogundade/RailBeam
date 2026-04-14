import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsIn(['onetime', 'recurrent'])
  kind!: 'onetime' | 'recurrent';

  @IsString()
  merchant!: string;

  /** One-time only */
  @IsOptional()
  @IsString()
  token?: string;

  /** One-time only */
  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** One-time only */
  @IsOptional()
  @IsBoolean()
  splitPayment?: boolean;

  /** Recurrent only */
  @IsOptional()
  @IsString()
  subscriptionId?: string;
}

