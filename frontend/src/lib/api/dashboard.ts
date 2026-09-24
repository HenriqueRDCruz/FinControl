import { apiFetch } from './client';

export interface DashboardOverview {
  netWorth: {
    netWorth: number;
    totalIncome: number;
    totalExpenses: number;
    totalInvestments: number;
  };
  currentMonth: {
    month: number;
    year: number;
    income: number;
    expenses: number;
    savingsRate: number;
  };
  trend: Array<{ month: number; year: number; income: number; expenses: number }>;
  expensesByCategory: Array<{ category: string; total: number }>;
  investments: {
    totalInvested: number;
    totalCurrent: number;
    profit: number;
    profitPercent: number;
    allocation: Array<{ type: string; currentValue: number; percent: number }>;
  };
}

export function getDashboardOverview() {
  return apiFetch<DashboardOverview>('/dashboard/overview');
}
