import { apiFetch } from './client';
import { InvestmentFormValues } from '../validations/investment.schema';

export interface Investment {
  id: string;
  type: string;
  name: string;
  institution: string | null;
  investedAmount: number;
  currentValue: number;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalCurrent: number;
  profit: number;
  profitPercent: number;
  allocation: Array<{ type: string; currentValue: number; percent: number }>;
}

export function listInvestments() {
  return apiFetch<Investment[]>('/investments');
}

export function getInvestmentSummary() {
  return apiFetch<InvestmentSummary>('/investments/summary');
}

export function createInvestment(data: InvestmentFormValues) {
  return apiFetch<Investment>('/investments', {
    method: 'POST',
    body: JSON.stringify({ ...data, institution: data.institution || undefined }),
  });
}

export function updateInvestment(id: string, data: Partial<InvestmentFormValues>) {
  return apiFetch<Investment>(`/investments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteInvestment(id: string) {
  return apiFetch<{ success: boolean }>(`/investments/${id}`, { method: 'DELETE' });
}
