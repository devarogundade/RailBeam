import { IsBoolean } from 'class-validator';

export class SetCardFrozenDto {
  @IsBoolean()
  frozen: boolean;
}

