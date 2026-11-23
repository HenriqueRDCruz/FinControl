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

  async getIncomeVsExpensesTrend(userId: string, months = TREND_MONTHS) {
    const now = new Date();
    const currentCycle = { month: now.getMonth() + 1, year: now.getFullYear() };

    const cycles = Array.from({ length: months }, (_, i) =>
      addCycles(currentCycle, -(months - 1 - i)),
    );

    // Duas consultas para o período inteiro (em vez de duas por mês) e a soma por mês é feita aqui.
    const first = getMonthRange(cycles[0].month, cycles[0].year);
    const last = getMonthRange(cycles[cycles.length - 1].month, cycles[cycles.length - 1].year);
    const where = { userId, date: { gte: first.start, lte: last.end } };

    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({ where, select: { date: true, amount: true } }),
      this.prisma.expense.findMany({ where, select: { date: true, amount: true } }),
    ]);

    const keyOf = (month: number, year: number) => `${year}-${month}`;
    const totals = new Map(cycles.map((c) => [keyOf(c.month, c.year), { income: 0, expenses: 0 }]));
    const sumInto = (rows: Array<{ date: Date; amount: unknown }>, field: 'income' | 'expenses') => {
      for (const row of rows) {
        // `date` é uma coluna DATE (meia-noite UTC): o mês é o do calendário, então lemos em UTC.
        const bucket = totals.get(keyOf(row.date.getUTCMonth() + 1, row.date.getUTCFullYear()));
        if (bucket) bucket[field] += Number(row.amount);
      }
    };
    sumInto(incomes, 'income');
    sumInto(expenses, 'expenses');

    return cycles.map((c) => {
      const t = totals.get(keyOf(c.month, c.year))!;
      return {
        month: c.month,
        year: c.year,
        income: Math.round(t.income * 100) / 100,
        expenses: Math.round(t.expenses * 100) / 100,
      };
    });
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
      this.netWorthService.getCurrent(userId, false),
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
