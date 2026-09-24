import { Test } from '@nestjs/testing';
import { NetWorthService } from '../net-worth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NetWorthService', () => {
  let service: NetWorthService;
  let prisma: {
    income: { aggregate: jest.Mock };
    expense: { aggregate: jest.Mock };
    investment: { findMany: jest.Mock };
    netWorthSnapshot: { upsert: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      income: { aggregate: jest.fn() },
      expense: { aggregate: jest.fn() },
      investment: { findMany: jest.fn() },
      netWorthSnapshot: {
        upsert: jest.fn((args) => Promise.resolve({ id: 'snap-1', ...args.create })),
        findMany: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [NetWorthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(NetWorthService);
  });

  describe('getCurrent', () => {
    it('calcula o patrimonio como renda acumulada - gastos acumulados + investimentos atuais', async () => {
      prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 10000 } });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 6000 } });
      prisma.investment.findMany.mockResolvedValue([
        { id: '1', currentValue: 2000 },
        { id: '2', currentValue: 1500 },
      ]);

      const result = await service.getCurrent('user-a');

      expect(result.totalIncome).toBe(10000);
      expect(result.totalExpenses).toBe(6000);
      expect(result.totalInvestments).toBe(3500);
      expect(result.netWorth).toBe(7500);
    });

    it('todo calculo e filtrado por userId — nunca mistura dados entre usuarios', async () => {
      prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.investment.findMany.mockResolvedValue([]);

      await service.getCurrent('user-b');

      expect(prisma.income.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-b' }) }),
      );
      expect(prisma.expense.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-b' }) }),
      );
      expect(prisma.investment.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-b', archived: false },
      });
    });

    it('lida com usuario sem nenhuma renda/gasto/investimento ainda (agregados nulos)', async () => {
      prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.investment.findMany.mockResolvedValue([]);

      const result = await service.getCurrent('user-novo');

      expect(result.netWorth).toBe(0);
    });

    it('grava (upsert) o snapshot do dia — historico e populado automaticamente, nunca digitado', async () => {
      prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
      prisma.investment.findMany.mockResolvedValue([]);

      await service.getCurrent('user-a');

      expect(prisma.netWorthSnapshot.upsert).toHaveBeenCalledTimes(1);
      const call = prisma.netWorthSnapshot.upsert.mock.calls[0][0];
      expect(call.where.userId_date.userId).toBe('user-a');
      expect(call.create.netWorth).toBe(4000);
    });
  });

  describe('getHistory', () => {
    it('retorna os snapshots em ordem cronologica (mais antigo primeiro)', async () => {
      prisma.netWorthSnapshot.findMany.mockResolvedValue([
        { id: '3', date: new Date('2026-08-03'), netWorth: 300 },
        { id: '2', date: new Date('2026-08-02'), netWorth: 200 },
        { id: '1', date: new Date('2026-08-01'), netWorth: 100 },
      ]);

      const result = await service.getHistory('user-a');

      expect(result.map((r) => r.netWorth)).toEqual([100, 200, 300]);
      expect(prisma.netWorthSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-a' }, orderBy: { date: 'desc' } }),
      );
    });
  });
});
