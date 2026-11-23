import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ExpenseCategory, IncomeSource } from '@prisma/client';

export const MAX_IMPORT_ITEMS = 300;

export class ImportItemDto {
  @IsIn(['INCOME', 'EXPENSE'])
  type!: 'INCOME' | 'EXPENSE';

  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  /** Só para type=INCOME */
  @IsEnum(IncomeSource)
  @IsOptional()
  source?: IncomeSource;

  /** Só para type=EXPENSE */
  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  /** Gasto de fatura: informe o cartão e o gasto entra na fatura certa */
  @IsString()
  @IsOptional()
  creditCardId?: string;
}

export class ImportStatementDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ImportItemDto)
  items!: ImportItemDto[];
}
