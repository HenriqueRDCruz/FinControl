import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../config/prisma";

export const categoryRepository = {
  findAll() {
    return prisma.category.findMany({ orderBy: { name: "asc" } });
  },

  findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  },

  findByNameAndType(name: string, type: TransactionType) {
    return prisma.category.findUnique({
      where: { name_type: { name, type } },
    });
  },

  create(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data });
  },

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.category.delete({ where: { id } });
  },

  countTransactions(id: string) {
    return prisma.transaction.count({ where: { categoryId: id } });
  },
};
