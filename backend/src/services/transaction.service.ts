import { z } from "zod";
import { TransactionType } from "@prisma/client";
import {
  transactionRepository,
  TransactionFilters,
} from "../repositories/transaction.repository";
import { categoryRepository } from "../repositories/category.repository";
import { AppError } from "../middlewares/AppError";

export const transactionSchema = z.object({
  description: z.string().trim().min(2, "Descrição deve ter ao menos 2 caracteres"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  type: z.nativeEnum(TransactionType),
  date: z.coerce.date(),
  categoryId: z.string().uuid("categoryId inválido"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

const filterSchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const transactionService = {
  list(rawFilters: unknown) {
    const filters: TransactionFilters = filterSchema.parse(rawFilters);
    return transactionRepository.findMany(filters);
  },

  async getById(id: string) {
    const transaction = await transactionRepository.findById(id);
    if (!transaction) throw new AppError("Transação não encontrada", 404);
    return transaction;
  },

  async create(input: TransactionInput) {
    const data = transactionSchema.parse(input);

    const category = await categoryRepository.findById(data.categoryId);
    if (!category) throw new AppError("Categoria informada não existe", 404);
    if (category.type !== data.type) {
      throw new AppError("O tipo da transação deve ser igual ao tipo da categoria", 422);
    }

    return transactionRepository.create(data);
  },

  async update(id: string, input: Partial<TransactionInput>) {
    await this.getById(id);
    const data = transactionSchema.partial().parse(input);
    return transactionRepository.update(id, data);
  },

  async remove(id: string) {
    await this.getById(id);
    return transactionRepository.delete(id);
  },
};
