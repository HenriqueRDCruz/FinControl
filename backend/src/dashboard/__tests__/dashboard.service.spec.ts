import { Test } from '@nestjs/testing';
import { DashboardService } from '../dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NetWorthService } from '../../net-worth/net-worth.service';
import { InvestmentsService } from '../../investments/investments.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    income: { aggregate: jest.Mock };
    expense: { aggregate: jest.Mock; groupBy: jest.Mock };
  };
  let netWorthService: { getCurrent: jest.Mock };
  let investmentsService: { getSummary: jest.Mock };

  beforeEach(async () => {
    prisma = {
      income: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
      expense: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };
    netWorthService = { getCurrent: jest.fn().mockResolvedValue({ netWorth: 1000 }) };
    investmentsService = { getSummary: jest.fn().mockResolvedValue({ totalInvested: 0 }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: NetWorthService, useValue: netWorthService },
        { provide: InvestmentsService, useValue: investmentsService },
      ],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  describe('getIncomeVsExpensesTrend', () => {
    it('retorna N meses em ordem cronologica, terminando no mes atual', async () => {
      const trend = await service.getIncomeVsExpensesTrend('user-a', 3);

      expect(trend).toHaveLength(3);
      const now = new Date();
      expect(trend[2].month).toBe(now.getMonth() + 1);
      expect(trend[2].year).toBe(now.getFullYear());

      const asIndex = (m: number, y: number) => y * 12 + m;
      expect(asIndex(trend[1].month, trend[1].year)).toBe(asIndex(trend[0].month, trend[0].year) + 1);
      expect(asIndex(trend[2].month, trend[2].year)).toBe(asIndex(trend[1].month, trend[1].year) + 1);
    });

    it('cada mes do trend e filtrado por userId', async () => {
      await service.getIncomeVsExpensesTrend('user-b', 2);
      expect(prisma.income.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-b' }) }),
      );
      expect(prisma.expense.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-b' }) }),
      );
    });
  });

  describe('getExpensesByCategory', () => {
    it('ordena as categorias da maior para a menor', async () => {
      prisma.expense.groupBy.mockResolvedValue([
        { category: 'FOOD', _sum: { amount: 300 } },
        { category: 'HOUSING', _sum: { amount: 1200 } },
        { category: 'LEISURE', _sum: { amount: 150 } },
      ]);

      const result = await service.getExpensesByCategory('user-a', 8, 2026);

      expect(result.map((r) => r.category)).toEqual(['HOUSING', 'FOOD', 'LEISURE']);
    });

    it('e filtrado por userId', async () => {
      await service.getExpensesByCategory('user-b', 8, 2026);
      expect(prisma.expense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-b' }) }),
      );
    });
  });

  describe('getOverview', () => {
    it('calcula a taxa de economia do mes corrente corretamente', async () => {
      prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 4000 } });

      const overview = await service.getOverview('user-a');

      expect(overview.currentMonth.savingsRate).toBe(20);
      expect(overview.netWorth).toEqual({ netWorth: 1000 });
      expect(netWorthService.getCurrent).toHaveBeenCalledWith('user-a');
      expect(investmentsService.getSummary).toHaveBeenCalledWith('user-a');
    });

    it('taxa de economia e 0 (nao quebra) quando nao ha renda no mes', async () => {
      prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 500 } });

      const overview = await service.getOverview('user-a');

      expect(overview.currentMonth.savingsRate).toBe(0);
    });
  });
});
