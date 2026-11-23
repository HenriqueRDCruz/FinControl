import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IncomesService } from '../incomes/incomes.service';
import { ExpensesService } from '../expenses/expenses.service';
import { ImportItemDto, ImportStatementDto } from './dto/import-statement.dto';

export interface ImportResult {
  createdIncomes: number;
  createdExpenses: number;
  /** Lançamentos que já existiam (mesmo tipo, dia, valor e descrição) e foram ignorados */
  skippedDuplicates: number;
}

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function keyOf(type: string, date: string, amount: number | string, description: string) {
  return `${type}|${date}|${Number(amount).toFixed(2)}|${normalize(description)}`;
}

/**
 * Importa vários lançamentos de uma vez (extrato da conta ou fatura do cartão).
 * Reaproveita IncomesService/ExpensesService, então valida e calcula fatura
 * exatamente como o cadastro manual.
 */
@Injectable()
export class StatementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incomes: IncomesService,
    private readonly expenses: ExpensesService,
  ) {}

  async importItems(userId: string, dto: ImportStatementDto): Promise<ImportResult> {
    const { items } = dto;
    await this.assertCardsBelongToUser(userId, items);

    // Quantas vezes cada lançamento já existe no banco (para poder reenviar o mesmo extrato)
    const existing = await this.countExisting(userId, items);

    const result: ImportResult = { createdIncomes: 0, createdExpenses: 0, skippedDuplicates: 0 };

    for (const item of items) {
      const key = keyOf(item.type, item.date.slice(0, 10), item.amount, item.description);
      const remaining = existing.get(key) ?? 0;
      if (remaining > 0) {
        existing.set(key, remaining - 1);
        result.skippedDuplicates++;
        continue;
      }

      if (item.type === 'INCOME') {
        await this.incomes.create(userId, {
          description: item.description,
          amount: item.amount,
          date: item.date,
          source: item.source ?? 'OTHER',
        });
        result.createdIncomes++;
      } else {
        await this.expenses.create(userId, {
          description: item.description,
          amount: item.amount,
          date: item.date,
          category: item.category ?? 'OTHER',
          paymentMethod: item.creditCardId ? 'CREDIT_CARD' : 'CASH',
          creditCardId: item.creditCardId,
        });
        result.createdExpenses++;
      }
    }

    return result;
  }

  private async assertCardsBelongToUser(userId: string, items: ImportItemDto[]) {
    const cardIds = [...new Set(items.map((i) => i.creditCardId).filter((id): id is string => !!id))];
    if (cardIds.length === 0) return;

    const found = await this.prisma.creditCard.findMany({
      where: { id: { in: cardIds }, userId },
      select: { id: true },
    });
    if (found.length !== cardIds.length) {
      throw new BadRequestException('Cartão não encontrado.');
    }
  }

  private async countExisting(userId: string, items: ImportItemDto[]) {
    const times = items.map((i) => new Date(i.date).getTime());
    const range = { gte: new Date(Math.min(...times)), lte: new Date(Math.max(...times)) };

    const wantsIncome = items.some((i) => i.type === 'INCOME');
    const wantsExpense = items.some((i) => i.type === 'EXPENSE');

    const [incomes, expenses] = await Promise.all([
      wantsIncome
        ? this.prisma.income.findMany({
            where: { userId, date: range },
            select: { date: true, amount: true, description: true },
          })
        : [],
      wantsExpense
        ? this.prisma.expense.findMany({
            where: { userId, date: range },
            select: { date: true, amount: true, description: true },
          })
        : [],
    ]);

    const counts = new Map<string, number>();
    const add = (type: string, rows: Array<{ date: Date; amount: unknown; description: string }>) => {
      for (const row of rows) {
        const key = keyOf(type, row.date.toISOString().slice(0, 10), Number(row.amount), row.description);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    };
    add('INCOME', incomes);
    add('EXPENSE', expenses);
    return counts;
  }
}
