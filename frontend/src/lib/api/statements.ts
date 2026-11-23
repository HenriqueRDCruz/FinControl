import { apiFetch } from './client';

export interface ImportItem {
  type: 'INCOME' | 'EXPENSE';
  date: string;
  description: string;
  amount: number;
  source?: string;
  category?: string;
  creditCardId?: string;
}

export interface ImportResult {
  createdIncomes: number;
  createdExpenses: number;
  skippedDuplicates: number;
}

const CHUNK_SIZE = 200; // o backend aceita até 300 por requisição

/** Envia em lotes. Se algo falhar no meio, reenviar é seguro: o que já foi gravado é reconhecido e ignorado. */
export async function importStatement(items: ImportItem[]): Promise<ImportResult> {
  const total: ImportResult = { createdIncomes: 0, createdExpenses: 0, skippedDuplicates: 0 };
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const partial = await apiFetch<ImportResult>('/statements/import', {
      method: 'POST',
      body: JSON.stringify({ items: items.slice(i, i + CHUNK_SIZE) }),
    });
    total.createdIncomes += partial.createdIncomes;
    total.createdExpenses += partial.createdExpenses;
    total.skippedDuplicates += partial.skippedDuplicates;
  }
  return total;
}
