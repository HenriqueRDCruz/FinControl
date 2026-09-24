import { z } from 'zod';

export const expenseCategoryOptions = [
  { value: 'HOUSING', label: 'Moradia' },
  { value: 'FOOD', label: 'Alimentacao' },
  { value: 'TRANSPORT', label: 'Transporte' },
  { value: 'HEALTH', label: 'Saude' },
  { value: 'EDUCATION', label: 'Educacao' },
  { value: 'LEISURE', label: 'Lazer' },
  { value: 'SUBSCRIPTIONS', label: 'Assinaturas' },
  { value: 'TAXES', label: 'Impostos' },
  { value: 'OTHER', label: 'Outro' },
] as const;

export const paymentMethodOptions = [
  { value: 'CASH', label: 'Dinheiro / Debito / Pix' },
  { value: 'CREDIT_CARD', label: 'Cartao de credito' },
] as const;

export const expenseSchema = z
  .object({
    description: z.string().min(1, 'Informe uma descricao').max(200),
    amount: z.coerce.number().positive('O valor deve ser maior que zero'),
    category: z
      .enum([
        'HOUSING',
        'FOOD',
        'TRANSPORT',
        'HEALTH',
        'EDUCATION',
        'LEISURE',
        'SUBSCRIPTIONS',
        'TAXES',
        'OTHER',
      ])
      .default('OTHER'),
    paymentMethod: z.enum(['CASH', 'CREDIT_CARD']).default('CASH'),
    installmentCount: z.coerce.number().int().min(1).max(48).optional(),
    creditCardId: z.string().optional(),
    date: z.string().min(1, 'Informe a data'),
    notes: z.string().max(500).optional().or(z.literal('')),
  })
  .refine(
    (data) => data.paymentMethod !== 'CREDIT_CARD' || (data.installmentCount ?? 1) >= 1,
    { message: 'Informe o numero de parcelas', path: ['installmentCount'] },
  );

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
