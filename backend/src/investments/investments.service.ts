import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/utils/ownership.util';
import { toPlainDecimal, toPlainDecimalList } from '../common/utils/decimal.util';
import { CreateInvestmentDto, UpdateInvestmentDto } from './dto/investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateInvestmentDto) {
    const investment = await this.prisma.investment.create({ data: { ...dto, userId } });
    return toPlainDecimal(investment, ['investedAmount', 'currentValue']);
  }

  async findAll(userId: string, includeArchived = false) {
    const investments = await this.prisma.investment.findMany({
      where: { userId, archived: includeArchived ? undefined : false },
      orderBy: { createdAt: 'desc' },
    });
    return toPlainDecimalList(investments, ['investedAmount', 'currentValue']);
  }

  async findOne(id: string, userId: string) {
    const investment = await this.prisma.investment.findFirst({ where: { id, userId } });
    return toPlainDecimal(assertFound(investment, 'Investimento nao encontrado'), [
      'investedAmount',
      'currentValue',
    ]);
  }

  async update(id: string, userId: string, dto: UpdateInvestmentDto) {
    const result = await this.prisma.investment.updateMany({ where: { id, userId }, data: dto });
    assertFound(result.count > 0 ? true : null, 'Investimento nao encontrado');
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    const result = await this.prisma.investment.deleteMany({ where: { id, userId } });
    assertFound(result.count > 0 ? true : null, 'Investimento nao encontrado');
    return { success: true };
  }

  async getSummary(userId: string) {
    const investments = await this.findAll(userId);

    const totalInvested = investments.reduce((sum, i) => sum + Number(i.investedAmount), 0);
    const totalCurrent = investments.reduce((sum, i) => sum + Number(i.currentValue), 0);
    const profit = totalCurrent - totalInvested;
    const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    const byType = new Map<string, number>();
    for (const inv of investments) {
      byType.set(inv.type, (byType.get(inv.type) ?? 0) + Number(inv.currentValue));
    }
    const allocation = Array.from(byType.entries()).map(([type, currentValue]) => ({
      type,
      currentValue: Math.round(currentValue * 100) / 100,
      percent: totalCurrent > 0 ? Math.round((currentValue / totalCurrent) * 1000) / 10 : 0,
    }));

    return {
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalCurrent: Math.round(totalCurrent * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitPercent: Math.round(profitPercent * 100) / 100,
      allocation,
    };
  }
}
