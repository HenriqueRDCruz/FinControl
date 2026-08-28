import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../config/prisma";

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
}

function buildWhere(filters: TransactionFilters): Prisma.TransactionWhereInput {
  return {
    type: filters.type,
    categoryId: filters.categoryId,
    date: {
      gte: filters.startDate,
      lte: filters.endDate,
    },
  };
}

export const transactionRepository = {
  findMany(filters: TransactionFilters) {
    return prisma.transaction.findMany({
      where: buildWhere(filters),
      include: { category: true },
      orderBy: { date: "desc" },
    });
  },

  findById(id: string) {
    return prisma.transaction.findUnique({
      where: { id },
      include: { category: true },
    });
  },

  create(data: Prisma.TransactionUncheckedCreateInput) {
    return prisma.transaction.create({ data, include: { category: true } });
  },

  update(id: string, data: Prisma.TransactionUncheckedUpdateInput) {
    return prisma.transaction.update({
      where: { id },
      data,
      include: { category: true },
    });
  },

  delete(id: string) {
    return prisma.transaction.delete({ where: { id } });
  },

  groupByCategory(filters: TransactionFilters) {
    return prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: buildWhere(filters),
      _sum: { amount: true },
      _count: true,
    });
  },

  sumByType(filters: TransactionFilters) {
    return prisma.transaction.groupBy({
      by: ["type"],
      where: buildWhere(filters),
      _sum: { amount: true },
    });
  },
};
