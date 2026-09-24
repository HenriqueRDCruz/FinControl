import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NetWorthService } from '../net-worth/net-worth.service';
import { InvestmentsService } from '../investments/investments.service';
import { getMonthRange } from '../common/utils/month-range.util';
import { addCycles } from '../common/utils/invoice-cycle.util';

const TREND_MONTHS = 6;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly netWorthService: NetWorthService,
    private readonly investmentsService: InvestmentsService,
  ) {}

  private async getMonthTotals(userId: string, month: number, year: number) {
    const { start, end } = getMonthRange(month, year);
    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.income.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expenses = Number(expenseAgg._sum.amount ?? 0);
    return {
      month,
      year,
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
    };
  }

  async getIncomeVsExpensesTrend(userId: string, months = TREND_MONTHS) {
    const now = new Date();
    const currentCycle = { month: now.getMonth() + 1, year: now.getFullYear() };

    const cycles = Array.from({ length: months }, (_, i) =>
      addCycles(currentCycle, -(months - 1 - i)),
    );

    return Promise.all(cycles.map((c) => this.getMonthTotals(userId, c.month, c.year)));
  }

  async getExpensesByCategory(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();
    const { start, end } = getMonthRange(targetMonth, targetYear);

    const grouped = await this.prisma.expense.groupBy({
      by: ['category'],
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    return grouped
      .map((g) => ({ category: g.category, total: Math.round(Number(g._sum.amount ?? 0) * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  }

  async getOverview(userId: string) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [netWorth, trend, expensesByCategory, investments] = await Promise.all([
      this.netWorthService.getCurrent(userId),
      this.getIncomeVsExpensesTrend(userId),
      this.getExpensesByCategory(userId, currentMonth, currentYear),
      this.investmentsService.getSummary(userId),
    ]);

    const currentMonthTotals = trend[trend.length - 1];
    const savingsRate =
      currentMonthTotals.income > 0
        ? Math.round(
            ((currentMonthTotals.income - currentMonthTotals.expenses) / currentMonthTotals.income) *
              1000,
          ) / 10
        : 0;

    return {
      netWorth,
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        income: currentMonthTotals.income,
        expenses: currentMonthTotals.expenses,
        savingsRate,
      },
      trend,
      expensesByCategory,
      investments,
    };
  }
}
