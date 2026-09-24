import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExpensesService } from '../expenses.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: {
    expense: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    creditCard: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      expense: {
        create: jest.fn((args) => Promise.resolve({ id: 'gen-id', ...args.data })),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      creditCard: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ExpensesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ExpensesService);
  });

  describe('create — gasto simples (dinheiro)', () => {
    it('cria um unico registro sem campos de parcela', async () => {
      const result = await service.create('user-a', {
        description: 'Mercado',
        amount: 250,
        date: '2026-08-10',
      });

      expect(Array.isArray(result)).toBe(false);
      expect(prisma.expense.create).toHaveBeenCalledTimes(1);
      const callArgs = prisma.expense.create.mock.calls[0][0].data;
      expect(callArgs.userId).toBe('user-a');
      expect(callArgs.installmentNumber).toBeUndefined();
    });
  });

  describe('create — cartao parcelado sem cartao vinculado (projecao simplificada)', () => {
    it('gera N parcelas cuja soma bate exatamente com o total da compra', async () => {
      const result = (await service.create('user-a', {
        description: 'Notebook',
        amount: 3000,
        paymentMethod: 'CREDIT_CARD' as any,
        installmentCount: 3,
        date: '2026-08-10',
      })) as any[];

      expect(result).toHaveLength(3);
      const sum = result.reduce((acc, r) => acc + Number(r.amount), 0);
      expect(Math.round(sum * 100) / 100).toBe(3000);
    });

    it('todas as parcelas compartilham o mesmo installmentGroupId e userId', async () => {
      await service.create('user-a', {
        description: 'Geladeira',
        amount: 1200,
        paymentMethod: 'CREDIT_CARD' as any,
        installmentCount: 4,
        date: '2026-08-10',
      });

      const dataCalls = prisma.expense.create.mock.calls.map((c) => c[0].data);
      const groupIds = new Set(dataCalls.map((d) => d.installmentGroupId));
      expect(groupIds.size).toBe(1);
      expect(dataCalls.every((d) => d.userId === 'user-a')).toBe(true);
      expect(dataCalls.map((d) => d.installmentNumber)).toEqual([1, 2, 3, 4]);
    });

    it('projeta o mes da fatura avancando um mes por parcela', async () => {
      await service.create('user-a', {
        description: 'Celular',
        amount: 600,
        paymentMethod: 'CREDIT_CARD' as any,
        installmentCount: 3,
        date: '2026-11-15',
      });

      const dataCalls = prisma.expense.create.mock.calls.map((c) => c[0].data);
      expect(dataCalls.map((d) => `${d.invoiceMonth}/${d.invoiceYear}`)).toEqual([
        '11/2026',
        '12/2026',
        '1/2027',
      ]);
    });

    it('compra a vista no cartao (installmentCount = 1) nao gera multiplos registros', async () => {
      const result = await service.create('user-a', {
        description: 'Farmacia',
        amount: 80,
        paymentMethod: 'CREDIT_CARD' as any,
        installmentCount: 1,
        date: '2026-08-10',
      });

      expect(Array.isArray(result)).toBe(false);
      expect(prisma.expense.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('create — cartao vinculado a um cadastro real', () => {
    it('usa o dia de fechamento do cartao para calcular a fatura', async () => {
      prisma.creditCard.findFirst.mockResolvedValue({
        id: 'card-1',
        userId: 'user-a',
        closingDay: 10,
      });

      await service.create('user-a', {
        description: 'Compra parcelada',
        amount: 300,
        paymentMethod: 'CREDIT_CARD' as any,
        installmentCount: 2,
        creditCardId: 'card-1',
        date: '2026-08-15',
      });

      expect(prisma.creditCard.findFirst).toHaveBeenCalledWith({
        where: { id: 'card-1', userId: 'user-a' },
      });
      const dataCalls = prisma.expense.create.mock.calls.map((c) => c[0].data);
      expect(dataCalls.map((d) => `${d.invoiceMonth}/${d.invoiceYear}`)).toEqual([
        '9/2026',
        '10/2026',
      ]);
      expect(dataCalls.every((d) => d.creditCardId === 'card-1')).toBe(true);
    });

    it('rejeita cartao que nao pertence ao usuario (404)', async () => {
      prisma.creditCard.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-b', {
          description: 'Tentativa invalida',
          amount: 100,
          paymentMethod: 'CREDIT_CARD' as any,
          creditCardId: 'card-de-outro-usuario',
          date: '2026-08-15',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('isolamento por usuario', () => {
    it('findOne lanca 404 quando o registro nao e do usuario', async () => {
      prisma.expense.findFirst.mockResolvedValue(null);
      await expect(service.findOne('id-de-outro', 'user-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.expense.findFirst).toHaveBeenCalledWith({
        where: { id: 'id-de-outro', userId: 'user-b' },
      });
    });

    it('remove usa deleteMany com userId — nunca exclui gasto de outro usuario', async () => {
      prisma.expense.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.remove('id-de-outro', 'user-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.expense.deleteMany).toHaveBeenCalledWith({
        where: { id: 'id-de-outro', userId: 'user-b' },
      });
    });
  });

  describe('update', () => {
    it('rejeita tentativa de alterar installmentCount de um gasto existente', async () => {
      await expect(
        service.update('id-1', 'user-a', { installmentCount: 5 } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.expense.updateMany).not.toHaveBeenCalled();
    });

    it('rejeita tentativa de alterar creditCardId de um gasto existente', async () => {
      await expect(
        service.update('id-1', 'user-a', { creditCardId: 'outro-cartao' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.expense.updateMany).not.toHaveBeenCalled();
    });
  });
});
