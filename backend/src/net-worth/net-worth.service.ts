import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toPlainDecimal, toPlainDecimalList } from '../common/utils/decimal.util';

const DEFAULT_HISTORY_LIMIT = 90;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class NetWorthService {
  constructor(private readonly prisma: PrismaService) {}

  private async computeTotals(userId: string, asOfDate: Date) {
    const [incomeAgg, expenseAgg, investments] = await Promise.all([
      this.prisma.income.aggregate({
        where: { userId, date: { lte: asOfDate } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId, date: { lte: asOfDate } },
        _sum: { amount: true },
      }),
      this.prisma.investment.findMany({ where: { userId, archived: false } }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
    const totalInvestments = toPlainDecimalList(investments, ['currentValue']).reduce(
      (sum, i) => sum + Number(i.currentValue),
      0,
    );
    const netWorth = totalIncome - totalExpenses + totalInvestments;

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalInvestments: Math.round(totalInvestments * 100) / 100,
      netWorth: Math.round(netWorth * 100) / 100,
    };
  }

  async getCurrent(userId: string) {
    const today = startOfDay(new Date());
    const totals = await this.computeTotals(userId, today);

    const snapshot = await this.prisma.netWorthSnapshot.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, ...totals },
      update: { ...totals },
    });

    return toPlainDecimal(snapshot, [
      'totalIncome',
      'totalExpenses',
      'totalInvestments',
      'netWorth',
    ]);
  }

  async getHistory(userId: string, limit = DEFAULT_HISTORY_LIMIT) {
    const snapshots = await this.prisma.netWorthSnapshot.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return toPlainDecimalList(snapshots, [
      'totalIncome',
      'totalExpenses',
      'totalInvestments',
      'netWorth',
    ]).reverse();
  }
}
