import { BadRequestException } from '@nestjs/common';
import { StatementsService } from '../statements.service';
import { ImportItemDto } from '../dto/import-statement.dto';

const item = (over: Partial<ImportItemDto> = {}): ImportItemDto => ({
  type: 'EXPENSE',
  date: '2026-10-05',
  description: 'Mercado Zaffari',
  amount: 123.45,
  category: 'FOOD',
  ...over,
});

describe('StatementsService', () => {
  let service: StatementsService;
  let prisma: {
    creditCard: { findMany: jest.Mock };
    income: { findMany: jest.Mock };
    expense: { findMany: jest.Mock };
  };
  let incomes: { create: jest.Mock };
  let expenses: { create: jest.Mock };

  beforeEach(() => {
    prisma = {
      creditCard: { findMany: jest.fn().mockResolvedValue([]) },
      income: { findMany: jest.fn().mockResolvedValue([]) },
      expense: { findMany: jest.fn().mockResolvedValue([]) },
    };
    incomes = { create: jest.fn().mockResolvedValue({}) };
    expenses = { create: jest.fn().mockResolvedValue({}) };
    service = new StatementsService(prisma as never, incomes as never, expenses as never);
  });

  it('cria rendas e gastos usando os serviços existentes', async () => {
    const result = await service.importItems('u1', {
      items: [
        item(),
        item({ type: 'INCOME', description: 'Salário', amount: 5000, source: 'SALARY', category: undefined }),
      ],
    });

    expect(result).toEqual({ createdIncomes: 1, createdExpenses: 1, skippedDuplicates: 0 });
    expect(expenses.create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ amount: 123.45, category: 'FOOD', paymentMethod: 'CASH' }),
    );
    expect(incomes.create).toHaveBeenCalledWith('u1', expect.objectContaining({ source: 'SALARY', amount: 5000 }));
  });

  it('gasto com cartão vai como CREDIT_CARD ligado ao cartão', async () => {
    prisma.creditCard.findMany.mockResolvedValue([{ id: 'c1' }]);
    await service.importItems('u1', { items: [item({ creditCardId: 'c1' })] });

    expect(expenses.create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ paymentMethod: 'CREDIT_CARD', creditCardId: 'c1' }),
    );
  });

  it('recusa cartão que não pertence ao usuário', async () => {
    prisma.creditCard.findMany.mockResolvedValue([]);
    await expect(service.importItems('u1', { items: [item({ creditCardId: 'de-outro' })] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(expenses.create).not.toHaveBeenCalled();
  });

  it('ignora lançamentos que já existem (reenviar o mesmo extrato não duplica)', async () => {
    prisma.expense.findMany.mockResolvedValue([
      { date: new Date('2026-10-05T00:00:00.000Z'), amount: 123.45, description: 'MERCADO  zaffari' },
    ]);

    const result = await service.importItems('u1', { items: [item(), item({ description: 'Padaria', amount: 8 })] });

    expect(result.skippedDuplicates).toBe(1);
    expect(result.createdExpenses).toBe(1);
    expect(expenses.create).toHaveBeenCalledTimes(1);
    expect(expenses.create).toHaveBeenCalledWith('u1', expect.objectContaining({ description: 'Padaria' }));
  });

  it('dois lançamentos idênticos legítimos no mesmo arquivo são criados os dois', async () => {
    const result = await service.importItems('u1', { items: [item(), item()] });
    expect(result.createdExpenses).toBe(2);
  });

  it('se só um dos idênticos já existe, cria apenas o que falta', async () => {
    prisma.expense.findMany.mockResolvedValue([
      { date: new Date('2026-10-05T00:00:00.000Z'), amount: 123.45, description: 'Mercado Zaffari' },
    ]);
    const result = await service.importItems('u1', { items: [item(), item()] });
    expect(result).toEqual({ createdIncomes: 0, createdExpenses: 1, skippedDuplicates: 1 });
  });
});
