import { z } from 'zod';

export const creditCardSchema = z.object({
  name: z.string().min(1, 'Informe um nome').max(100),
  limitAmount: z.coerce.number().positive('O limite deve ser maior que zero'),
  closingDay: z.coerce.number().int().min(1, 'Entre 1 e 31').max(31, 'Entre 1 e 31'),
  dueDay: z.coerce.number().int().min(1, 'Entre 1 e 31').max(31, 'Entre 1 e 31'),
});

export type CreditCardFormValues = z.infer<typeof creditCardSchema>;
