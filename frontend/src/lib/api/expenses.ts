import { apiFetch } from './client';
import { ExpenseFormValues } from '../validations/expense.schema';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: string;
  date: string;
  installmentNumber: number | null;
  installmentCount: number | null;
  notes: string | null;
}

interface ExpensesListResponse {
  items: Expense[];
  total: number;
}

export function listExpenses(params?: {
  startDate?: string;
  endDate?: string;
  category?: string;
  paymentMethod?: string;
}) {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.category) query.set('category', params.category);
  if (params?.paymentMethod) query.set('paymentMethod', params.paymentMethod);
  const qs = query.toString();
  return apiFetch<ExpensesListResponse>(`/expenses${qs ? `?${qs}` : ''}`);
}

export function createExpense(data: ExpenseFormValues) {
  const payload: Record<string, unknown> = { ...data, notes: data.notes || undefined };
  if (data.paymentMethod !== 'CREDIT_CARD') {
    delete payload.installmentCount;
    delete payload.creditCardId;
  } else if (!data.creditCardId) {
    delete payload.creditCardId;
  }
  return apiFetch<Expense | Expense[]>('/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateExpense(id: string, data: Partial<ExpenseFormValues>) {
  return apiFetch<Expense>(`/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteExpense(id: string) {
  return apiFetch<{ success: boolean }>(`/expenses/${id}`, { method: 'DELETE' });
}
