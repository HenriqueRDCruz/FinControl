const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro na requisição (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export type TransactionType = "INCOME" | "EXPENSE";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color?: string | null;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  categoryId: string;
  category: Category;
}

export interface Summary {
  income: number;
  expense: number;
  balance: number;
}

export const api = {
  categories: {
    list: () => request<Category[]>("/categories"),
    create: (data: Omit<Category, "id">) =>
      request<Category>("/categories", { method: "POST", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/categories/${id}`, { method: "DELETE" }),
  },
  transactions: {
    list: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params).toString()}` : "";
      return request<Transaction[]>(`/transactions${query}`);
    },
    create: (data: Omit<Transaction, "id" | "category">) =>
      request<Transaction>("/transactions", { method: "POST", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/transactions/${id}`, { method: "DELETE" }),
  },
  reports: {
    summary: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params).toString()}` : "";
      return request<Summary>(`/reports/summary${query}`);
    },
    byCategory: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params).toString()}` : "";
      return request<
        { category: string; type: TransactionType; total: number; count: number }[]
      >(`/reports/by-category${query}`);
    },
  },
};
