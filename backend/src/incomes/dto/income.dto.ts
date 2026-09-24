import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  IsPositive,
  IsEnum,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { IncomeSource } from '@prisma/client';

export class CreateIncomeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsEnum(IncomeSource)
  @IsOptional()
  source?: IncomeSource;

  @IsDateString()
  date!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class UpdateIncomeDto extends PartialType(CreateIncomeDto) {}

export class QueryIncomeDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
