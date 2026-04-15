import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TermsAcceptanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}

export class CreateVirtualCardDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TermsAcceptanceDto)
  termsAcceptance?: TermsAcceptanceDto;
}
