import { z } from 'zod';

export const incomeSourceOptions = [
  { value: 'SALARY', label: 'Salario' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'INVESTMENT_INCOME', label: 'Rendimento de investimento' },
  { value: 'GIFT', label: 'Presente' },
  { value: 'OTHER', label: 'Outro' },
] as const;

export const incomeSchema = z.object({
  description: z.string().min(1, 'Informe uma descricao').max(200),
  amount: z.coerce.number().positive('O valor deve ser maior que zero'),
  source: z.enum(['SALARY', 'FREELANCE', 'INVESTMENT_INCOME', 'GIFT', 'OTHER']).default('OTHER'),
  date: z.string().min(1, 'Informe a data'),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type IncomeFormValues = z.infer<typeof incomeSchema>;
