import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIssuingEphemeralKeyDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  cardId: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(255)
  nonce: string;
}

