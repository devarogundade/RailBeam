import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

function toPositiveNumber(value: unknown): unknown {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

export class CreateX402LinkDto {
  @IsString()
  @MinLength(1)
  link!: string;

  @Transform(({ value }) => toPositiveNumber(value))
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsIn(['USDC'])
  currency!: 'USDC';

  @IsString()
  @MinLength(1)
  network!: string;

  @IsString()
  @MinLength(1)
  payTo!: string;

  /** USDC token address; optional if network is known or X402_USDC_ASSET is set. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  asset?: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateX402FileMetaDto {
  @Transform(({ value }) => toPositiveNumber(value))
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsIn(['USDC'])
  currency!: 'USDC';

  @IsString()
  @MinLength(1)
  network!: string;

  @IsString()
  @MinLength(1)
  payTo!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  asset?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
