import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/utils/ownership.util';
import { toPlainDecimal, toPlainDecimalList } from '../common/utils/decimal.util';
import { splitAmount } from '../common/utils/split-amount.util';
import { computeInvoiceCycle, addCycles, InvoiceCycle } from '../common/utils/invoice-cycle.util';
import { CreateExpenseDto, UpdateExpenseDto, QueryExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateExpenseDto) {
    const purchaseDate = new Date(dto.date);

    let baseCycle: InvoiceCycle | null = null;
    if (dto.creditCardId) {
      const card = await this.prisma.creditCard.findFirst({
        where: { id: dto.creditCardId, userId },
      });
      assertFound(card, 'Cartao nao encontrado');
      baseCycle = computeInvoiceCycle(purchaseDate, card!.closingDay);
    } else if (dto.paymentMethod === 'CREDIT_CARD') {
      baseCycle = { month: purchaseDate.getMonth() + 1, year: purchaseDate.getFullYear() };
    }

    if (dto.paymentMethod !== 'CREDIT_CARD' || !dto.installmentCount || dto.installmentCount === 1) {
      const expense = await this.prisma.expense.create({
        data: {
          userId,
          description: dto.description,
          amount: dto.amount,
          category: dto.category,
          paymentMethod: dto.paymentMethod,
          date: purchaseDate,
          notes: dto.notes,
          ...(dto.paymentMethod === 'CREDIT_CARD' && baseCycle
            ? {
                creditCardId: dto.creditCardId,
                installmentNumber: 1,
                installmentCount: 1,
                invoiceMonth: baseCycle.month,
                invoiceYear: baseCycle.year,
              }
            : {}),
        },
      });
      return toPlainDecimal(expense, ['amount']);
    }

    const installments = splitAmount(dto.amount, dto.installmentCount);
    const groupId = randomUUID();

    const created = await this.prisma.$transaction(
      installments.map((installmentAmount, index) => {
        const cycle = addCycles(baseCycle!, index);
        return this.prisma.expense.create({
          data: {
            userId,
            description: dto.description,
            amount: installmentAmount,
            category: dto.category,
            paymentMethod: dto.paymentMethod,
            date: purchaseDate,
            notes: dto.notes,
            creditCardId: dto.creditCardId,
            installmentNumber: index + 1,
            installmentCount: dto.installmentCount,
            installmentGroupId: groupId,
            invoiceMonth: cycle.month,
            invoiceYear: cycle.year,
          },
        });
      }),
    );

    return toPlainDecimalList(created, ['amount']);
  }

  async findAll(userId: string, query: QueryExpenseDto) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        category: query.category,
        paymentMethod: query.paymentMethod,
        date: {
          gte: query.startDate ? new Date(query.startDate) : undefined,
          lte: query.endDate ? new Date(query.endDate) : undefined,
        },
      },
      orderBy: { date: 'desc' },
    });

    const list = toPlainDecimalList(expenses, ['amount']);
    const total = list.reduce((sum, item) => sum + Number(item.amount), 0);

    return { items: list, total };
  }

  async findOne(id: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, userId } });
    return toPlainDecimal(assertFound(expense, 'Gasto nao encontrado'), ['amount']);
  }

  async update(id: string, userId: string, dto: UpdateExpenseDto) {
    if (dto.installmentCount || dto.creditCardId) {
      throw new BadRequestException(
        'Nao e possivel alterar o parcelamento ou o cartao de um gasto existente. Exclua e lance novamente.',
      );
    }

    const result = await this.prisma.expense.updateMany({
      where: { id, userId },
      data: {
        description: dto.description,
        amount: dto.amount,
        category: dto.category,
        date: dto.date ? new Date(dto.date) : undefined,
        notes: dto.notes,
      },
    });
    assertFound(result.count > 0 ? true : null, 'Gasto nao encontrado');
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    const result = await this.prisma.expense.deleteMany({ where: { id, userId } });
    assertFound(result.count > 0 ? true : null, 'Gasto nao encontrado');
    return { success: true };
  }
}
