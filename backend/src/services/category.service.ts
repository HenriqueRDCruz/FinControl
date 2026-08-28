import { z } from "zod";
import { TransactionType } from "@prisma/client";
import { categoryRepository } from "../repositories/category.repository";
import { AppError } from "../middlewares/AppError";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  type: z.nativeEnum(TransactionType),
  color: z.string().trim().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const categoryService = {
  list() {
    return categoryRepository.findAll();
  },

  async getById(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new AppError("Categoria não encontrada", 404);
    return category;
  },

  async create(input: CategoryInput) {
    const data = categorySchema.parse(input);

    const existing = await categoryRepository.findByNameAndType(data.name, data.type);
    if (existing) throw new AppError("Já existe uma categoria com esse nome e tipo", 409);

    return categoryRepository.create(data);
  },

  async update(id: string, input: Partial<CategoryInput>) {
    await this.getById(id);
    const data = categorySchema.partial().parse(input);
    return categoryRepository.update(id, data);
  },

  async remove(id: string) {
    await this.getById(id);
    const total = await categoryRepository.countTransactions(id);
    if (total > 0) {
      throw new AppError(
        "Não é possível excluir uma categoria que possui transações vinculadas",
        409
      );
    }
    return categoryRepository.delete(id);
  },
};
