import { apiFetch } from './client';

export interface NetWorthSnapshot {
  id: string;
  date: string;
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  netWorth: number;
}

export function getCurrentNetWorth() {
  return apiFetch<NetWorthSnapshot>('/net-worth/current');
}

export function getNetWorthHistory(limit?: number) {
  const qs = limit ? `?limit=${limit}` : '';
  return apiFetch<NetWorthSnapshot[]>(`/net-worth/history${qs}`);
}
