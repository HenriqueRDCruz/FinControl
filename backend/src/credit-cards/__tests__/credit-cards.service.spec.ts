import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CreditCardsService } from '../credit-cards.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CreditCardsService', () => {
  let service: CreditCardsService;
  let prisma: {
    creditCard: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
    expense: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      creditCard: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      expense: { findMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [CreditCardsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(CreditCardsService);
  });

  describe('isolamento por usuario', () => {
    it('findOne lanca 404 quando o cartao nao e do usuario', async () => {
      prisma.creditCard.findFirst.mockResolvedValue(null);
      await expect(service.findOne('card-de-outro', 'user-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.creditCard.findFirst).toHaveBeenCalledWith({
        where: { id: 'card-de-outro', userId: 'user-b' },
      });
    });

    it('remove (arquivar) usa updateMany com userId — nunca arquiva cartao de outro usuario', async () => {
      prisma.creditCard.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.remove('card-de-outro', 'user-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.creditCard.updateMany).toHaveBeenCalledWith({
        where: { id: 'card-de-outro', userId: 'user-b' },
        data: { archived: true },
      });
    });
  });

  describe('remove', () => {
    it('arquiva em vez de excluir de fato (preserva historico de fatura)', async () => {
      prisma.creditCard.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.remove('card-1', 'user-a');
      expect(result).toEqual({ success: true });
      expect(prisma.creditCard.updateMany).toHaveBeenCalledWith({
        where: { id: 'card-1', userId: 'user-a' },
        data: { archived: true },
      });
    });
  });

  describe('getInvoice', () => {
    it('soma apenas os gastos do cartao no ciclo pedido, filtrados por userId', async () => {
      prisma.creditCard.findFirst.mockResolvedValue({
        id: 'card-1',
        userId: 'user-a',
        closingDay: 10,
        limitAmount: 5000,
      });
      prisma.expense.findMany.mockResolvedValue([
        { id: '1', amount: 100, invoiceMonth: 9, invoiceYear: 2026 },
        { id: '2', amount: 250, invoiceMonth: 9, invoiceYear: 2026 },
      ]);

      const result = await service.getInvoice('card-1', 'user-a', 9, 2026);

      expect(result.total).toBe(350);
      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-a', creditCardId: 'card-1', invoiceMonth: 9, invoiceYear: 2026 },
        orderBy: { date: 'asc' },
      });
    });
  });

  describe('getLimitUsage', () => {
    it('calcula o limite disponivel como limite total menos parcelas em aberto', async () => {
      prisma.creditCard.findFirst.mockResolvedValue({
        id: 'card-1',
        userId: 'user-a',
        closingDay: 10,
        limitAmount: 5000,
      });
      prisma.expense.findMany.mockResolvedValue([
        { id: '1', amount: 1000, invoiceMonth: 1, invoiceYear: 2000 },
        { id: '2', amount: 500, invoiceMonth: 1, invoiceYear: 2099 },
      ]);

      const result = await service.getLimitUsage('card-1', 'user-a');

      expect(result.limitAmount).toBe(5000);
      expect(result.used).toBe(500);
      expect(result.available).toBe(4500);
    });
  });
});
