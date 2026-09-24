import { IsString, IsNotEmpty, MaxLength, IsNumber, IsPositive, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCreditCardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  limitAmount!: number;

  @IsInt()
  @Min(1)
  @Max(31)
  closingDay!: number;

  @IsInt()
  @Min(1)
  @Max(31)
  dueDay!: number;
}

export class UpdateCreditCardDto extends PartialType(CreateCreditCardDto) {
  @IsBoolean()
  @IsOptional()
  archived?: boolean;
}

export class QueryInvoiceDto {
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @IsInt()
  @Min(2000)
  @IsOptional()
  year?: number;
}
