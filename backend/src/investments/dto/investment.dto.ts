import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  IsPositive,
  Min,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { InvestmentType } from '@prisma/client';

export class CreateInvestmentDto {
  @IsEnum(InvestmentType)
  type!: InvestmentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  institution?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  investedAmount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentValue!: number;
}

export class UpdateInvestmentDto extends PartialType(CreateInvestmentDto) {}
