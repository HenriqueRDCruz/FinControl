import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/utils/ownership.util';
import { toPlainDecimal, toPlainDecimalList } from '../common/utils/decimal.util';
import { CreateIncomeDto, UpdateIncomeDto, QueryIncomeDto } from './dto/income.dto';

@Injectable()
export class IncomesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateIncomeDto) {
    const income = await this.prisma.income.create({
      data: { ...dto, userId, date: new Date(dto.date) },
    });
    return toPlainDecimal(income, ['amount']);
  }

  async findAll(userId: string, query: QueryIncomeDto) {
    const incomes = await this.prisma.income.findMany({
      where: {
        userId,
        date: {
          gte: query.startDate ? new Date(query.startDate) : undefined,
          lte: query.endDate ? new Date(query.endDate) : undefined,
        },
      },
      orderBy: { date: 'desc' },
    });

    const list = toPlainDecimalList(incomes, ['amount']);
    const total = list.reduce((sum, item) => sum + Number(item.amount), 0);

    return { items: list, total };
  }

  async findOne(id: string, userId: string) {
    const income = await this.prisma.income.findFirst({ where: { id, userId } });
    return toPlainDecimal(assertFound(income, 'Renda nao encontrada'), ['amount']);
  }

  async update(id: string, userId: string, dto: UpdateIncomeDto) {
    const result = await this.prisma.income.updateMany({
      where: { id, userId },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });
    assertFound(result.count > 0 ? true : null, 'Renda nao encontrada');
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    const result = await this.prisma.income.deleteMany({ where: { id, userId } });
    assertFound(result.count > 0 ? true : null, 'Renda nao encontrada');
    return { success: true };
  }
}
