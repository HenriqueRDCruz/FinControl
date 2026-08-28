import { z } from "zod";
import { transactionRepository } from "../repositories/transaction.repository";
import { categoryRepository } from "../repositories/category.repository";

const filterSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const reportService = {
  async summary(rawFilters: unknown) {
    const filters = filterSchema.parse(rawFilters);
    const totals = await transactionRepository.sumByType(filters);

    const income = Number(totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0);
    const expense = Number(totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0);

    return {
      income,
      expense,
      balance: income - expense,
    };
  },

  async byCategory(rawFilters: unknown) {
    const filters = filterSchema.parse(rawFilters);
    const grouped = await transactionRepository.groupByCategory(filters);
    const categories = await categoryRepository.findAll();
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return grouped.map((g) => ({
      category: categoryMap.get(g.categoryId)?.name ?? "Desconhecida",
      type: g.type,
      total: Number(g._sum.amount ?? 0),
      count: g._count,
    }));
  },
};
