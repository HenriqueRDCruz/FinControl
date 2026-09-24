import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InvestmentsService } from '../investments.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InvestmentsService', () => {
  let service: InvestmentsService;
  let prisma: {
    investment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      investment: {
        create: jest.fn((args) => Promise.resolve({ id: 'gen-id', ...args.data })),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [InvestmentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(InvestmentsService);
  });

  describe('isolamento por usuario', () => {
    it('findOne lanca 404 quando o investimento nao e do usuario', async () => {
      prisma.investment.findFirst.mockResolvedValue(null);
      await expect(service.findOne('id-de-outro', 'user-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.investment.findFirst).toHaveBeenCalledWith({
        where: { id: 'id-de-outro', userId: 'user-b' },
      });
    });

    it('remove usa deleteMany com userId — nunca exclui investimento de outro usuario', async () => {
      prisma.investment.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.remove('id-de-outro', 'user-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.investment.deleteMany).toHaveBeenCalledWith({
        where: { id: 'id-de-outro', userId: 'user-b' },
      });
    });
  });

  describe('getSummary', () => {
    it('calcula total investido, valor atual, lucro e percentual corretamente', async () => {
      prisma.investment.findMany.mockResolvedValue([
        { id: '1', type: 'STOCK', investedAmount: 1000, currentValue: 1200 },
        { id: '2', type: 'FIXED_INCOME', investedAmount: 2000, currentValue: 2100 },
      ]);

      const result = await service.getSummary('user-a');

      expect(result.totalInvested).toBe(3000);
      expect(result.totalCurrent).toBe(3300);
      expect(result.profit).toBe(300);
      expect(result.profitPercent).toBe(10);
    });

    it('agrupa a distribuicao da carteira por tipo com percentuais somando ~100%', async () => {
      prisma.investment.findMany.mockResolvedValue([
        { id: '1', type: 'STOCK', investedAmount: 1000, currentValue: 750 },
        { id: '2', type: 'FIXED_INCOME', investedAmount: 1000, currentValue: 250 },
      ]);

      const result = await service.getSummary('user-a');
      const stock = result.allocation.find((a) => a.type === 'STOCK');
      const fixedIncome = result.allocation.find((a) => a.type === 'FIXED_INCOME');

      expect(stock?.percent).toBe(75);
      expect(fixedIncome?.percent).toBe(25);
    });

    it('nao quebra com carteira vazia (divisao por zero)', async () => {
      prisma.investment.findMany.mockResolvedValue([]);
      const result = await service.getSummary('user-a');
      expect(result.totalInvested).toBe(0);
      expect(result.profitPercent).toBe(0);
      expect(result.allocation).toEqual([]);
    });
  });
});
