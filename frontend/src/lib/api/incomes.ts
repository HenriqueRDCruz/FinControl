import { apiFetch } from './client';
import { IncomeFormValues } from '../validations/income.schema';

export interface Income {
  id: string;
  description: string;
  amount: number;
  source: string;
  date: string;
  notes: string | null;
}

interface IncomesListResponse {
  items: Income[];
  total: number;
}

export function listIncomes(params?: { startDate?: string; endDate?: string }) {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  const qs = query.toString();
  return apiFetch<IncomesListResponse>(`/incomes${qs ? `?${qs}` : ''}`);
}

export function createIncome(data: IncomeFormValues) {
  return apiFetch<Income>('/incomes', {
    method: 'POST',
    body: JSON.stringify({ ...data, notes: data.notes || undefined }),
  });
}

export function updateIncome(id: string, data: Partial<IncomeFormValues>) {
  return apiFetch<Income>(`/incomes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteIncome(id: string) {
  return apiFetch<{ success: boolean }>(`/incomes/${id}`, { method: 'DELETE' });
}
