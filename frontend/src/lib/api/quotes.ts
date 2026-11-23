import { apiFetch } from './client';

export interface Quote {
  code: string;
  name: string;
  /** Preço em reais */
  bid: number;
  /** Variação do dia, em % */
  pctChange: number;
}

export interface QuotesResponse {
  base: 'BRL';
  updatedAt: string;
  /** true = a fonte externa falhou e estas são as últimas cotações guardadas */
  stale: boolean;
  items: Quote[];
}

export function getQuotes() {
  return apiFetch<QuotesResponse>('/quotes');
}
