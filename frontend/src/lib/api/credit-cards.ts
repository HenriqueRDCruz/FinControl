import { apiFetch } from './client';
import { CreditCardFormValues } from '../validations/credit-card.schema';

export interface CreditCard {
  id: string;
  name: string;
  limitAmount: number;
  closingDay: number;
  dueDay: number;
  archived: boolean;
}

export interface Invoice {
  month: number;
  year: number;
  items: Array<{ id: string; description: string; amount: number; date: string }>;
  total: number;
}

export interface LimitUsage {
  limitAmount: number;
  used: number;
  available: number;
}

export function listCreditCards() {
  return apiFetch<CreditCard[]>('/credit-cards');
}

export function createCreditCard(data: CreditCardFormValues) {
  return apiFetch<CreditCard>('/credit-cards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function archiveCreditCard(id: string) {
  return apiFetch<{ success: boolean }>(`/credit-cards/${id}`, { method: 'DELETE' });
}

export function getCurrentInvoice(id: string) {
  return apiFetch<Invoice>(`/credit-cards/${id}/invoice`);
}

export function getUpcomingInvoices(id: string) {
  return apiFetch<Invoice[]>(`/credit-cards/${id}/upcoming-invoices`);
}

export function getLimitUsage(id: string) {
  return apiFetch<LimitUsage>(`/credit-cards/${id}/limit`);
}
