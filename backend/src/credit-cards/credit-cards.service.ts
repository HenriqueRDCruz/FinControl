import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/utils/ownership.util';
import { toPlainDecimal, toPlainDecimalList } from '../common/utils/decimal.util';
import { computeInvoiceCycle, addCycles, compareCycles } from '../common/utils/invoice-cycle.util';
import { CreateCreditCardDto, UpdateCreditCardDto } from './dto/credit-card.dto';

const UPCOMING_INVOICES_COUNT = 3;

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCreditCardDto) {
    const card = await this.prisma.creditCard.create({ data: { ...dto, userId } });
    return toPlainDecimal(card, ['limitAmount']);
  }

  async findAll(userId: string, includeArchived = false) {
    const cards = await this.prisma.creditCard.findMany({
      where: { userId, archived: includeArchived ? undefined : false },
      orderBy: { name: 'asc' },
    });
    return toPlainDecimalList(cards, ['limitAmount']);
  }

  async findOne(id: string, userId: string) {
    const card = await this.prisma.creditCard.findFirst({ where: { id, userId } });
    return toPlainDecimal(assertFound(card, 'Cartao nao encontrado'), ['limitAmount']);
  }

  async update(id: string, userId: string, dto: UpdateCreditCardDto) {
    const result = await this.prisma.creditCard.updateMany({ where: { id, userId }, data: dto });
    assertFound(result.count > 0 ? true : null, 'Cartao nao encontrado');
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    const result = await this.prisma.creditCard.updateMany({
      where: { id, userId },
      data: { archived: true },
    });
    assertFound(result.count > 0 ? true : null, 'Cartao nao encontrado');
    return { success: true };
  }

  async getInvoice(id: string, userId: string, month?: number, year?: number) {
    const card = await this.findOne(id, userId);
    const cycle = month && year ? { month, year } : computeInvoiceCycle(new Date(), card.closingDay);

    const expenses = await this.prisma.expense.findMany({
      where: { userId, creditCardId: id, invoiceMonth: cycle.month, invoiceYear: cycle.year },
      orderBy: { date: 'asc' },
    });

    const items = toPlainDecimalList(expenses, ['amount']);
    const total = items.reduce((sum, item) => sum + Number(item.amount), 0);

    return { month: cycle.month, year: cycle.year, items, total };
  }

  async getUpcomingInvoices(id: string, userId: string, count = UPCOMING_INVOICES_COUNT) {
    const card = await this.findOne(id, userId);
    const currentCycle = computeInvoiceCycle(new Date(), card.closingDay);

    const invoices = [];
    for (let i = 0; i < count; i++) {
      const cycle = addCycles(currentCycle, i);
      invoices.push(await this.getInvoice(id, userId, cycle.month, cycle.year));
    }
    return invoices;
  }

  async getLimitUsage(id: string, userId: string) {
    const card = await this.findOne(id, userId);
    const currentCycle = computeInvoiceCycle(new Date(), card.closingDay);

    const openExpenses = await this.prisma.expense.findMany({
      where: { userId, creditCardId: id },
    });

    const used = toPlainDecimalList(openExpenses, ['amount'])
      .filter((e) => e.invoiceMonth && e.invoiceYear && compareCycles({ month: e.invoiceMonth, year: e.invoiceYear }, currentCycle) >= 0)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const limitAmount = Number(card.limitAmount);
    return {
      limitAmount,
      used: Math.round(used * 100) / 100,
      available: Math.round((limitAmount - used) * 100) / 100,
    };
  }
}
