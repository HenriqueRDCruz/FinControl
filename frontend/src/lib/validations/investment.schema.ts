import { z } from 'zod';

export const investmentTypeOptions = [
  { value: 'STOCK', label: 'Acoes' },
  { value: 'ETF', label: 'ETF' },
  { value: 'REIT', label: 'FII / REIT' },
  { value: 'FIXED_INCOME', label: 'Renda fixa' },
  { value: 'FUND', label: 'Fundo' },
  { value: 'CRYPTO', label: 'Criptomoeda' },
  { value: 'OTHER', label: 'Outro' },
] as const;

export const investmentSchema = z.object({
  type: z.enum(['STOCK', 'ETF', 'REIT', 'FIXED_INCOME', 'FUND', 'CRYPTO', 'OTHER']),
  name: z.string().min(1, 'Informe um nome').max(200),
  institution: z.string().max(120).optional().or(z.literal('')),
  investedAmount: z.coerce.number().positive('O valor investido deve ser maior que zero'),
  currentValue: z.coerce.number().min(0, 'O valor atual nao pode ser negativo'),
});

export type InvestmentFormValues = z.infer<typeof investmentSchema>;
