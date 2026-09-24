'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { getDashboardOverview, DashboardOverview } from '@/lib/api/dashboard';
import { expenseCategoryOptions } from '@/lib/validations/expense.schema';
import { investmentTypeOptions } from '@/lib/validations/investment.schema';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
});
const MONTH_ABBR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function categoryLabel(value: string) {
  return expenseCategoryOptions.find((o) => o.value === value)?.label ?? value;
}

function typeLabel(value: string) {
  return investmentTypeOptions.find((o) => o.value === value)?.label ?? value;
}

type LoadState = 'loading' | 'ready' | 'error';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const overview = await getDashboardOverview();
      setData(overview);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const trendData = data?.trend.map((t) => ({
    label: `${MONTH_ABBR[t.month - 1]}/${String(t.year).slice(2)}`,
    Receitas: t.income,
    Despesas: t.expenses,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">
            ← Inicio
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Resumo financeiro</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <span className="hidden rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 sm:inline-flex dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">Visão geral</span>
      </div>

      {loadState === 'loading' && (
        <p className="py-8 text-center text-sm text-neutral-500">Carregando…</p>
      )}

      {loadState === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            Nao foi possivel carregar o dashboard.
          </p>
          <button onClick={load} className="mt-2 text-sm text-red-700 underline dark:text-red-300">
            Tentar novamente
          </button>
        </div>
      )}

      {loadState === 'ready' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/net-worth"
              className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <p className="text-xs text-neutral-500">Patrimonio liquido</p>
              <p className="text-xl font-semibold">
                {currencyFormatter.format(data.netWorth.netWorth)}
              </p>
            </Link>
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="text-xs text-neutral-500">Taxa de economia (mes)</p>
              <p
                className={`text-xl font-semibold ${data.currentMonth.savingsRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {data.currentMonth.savingsRate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="text-xs text-neutral-500">Receitas do mes</p>
              <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400">
                {currencyFormatter.format(data.currentMonth.income)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="text-xs text-neutral-500">Despesas do mes</p>
              <p className="text-lg font-medium text-red-600 dark:text-red-400">
                {currencyFormatter.format(data.currentMonth.expenses)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="mb-2 text-xs text-neutral-500">Receitas x despesas (ultimos 6 meses)</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => compactCurrencyFormatter.format(v)} width={50} />
                  <Tooltip formatter={(v: number) => currencyFormatter.format(v)} />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="mb-3 text-xs text-neutral-500">Gastos por categoria (mes atual)</p>
            {data.expensesByCategory.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhum gasto neste mes ainda.</p>
            ) : (
              <div className="space-y-2">
                {data.expensesByCategory.map((c) => {
                  const max = data.expensesByCategory[0].total;
                  const percent = max > 0 ? Math.round((c.total / max) * 100) : 0;
                  return (
                    <div key={c.category} className="flex items-center gap-2 text-sm">
                      <span className="w-28 shrink-0">{categoryLabel(c.category)}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs text-neutral-500">
                        {currencyFormatter.format(c.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/investments"
            className="block rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <p className="mb-3 text-xs text-neutral-500">Investimentos por tipo</p>
            {data.investments.allocation.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhum investimento cadastrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {data.investments.allocation.map((a) => (
                  <div key={a.type} className="flex items-center gap-2 text-sm">
                    <span className="w-28 shrink-0">{typeLabel(a.type)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className="h-full bg-neutral-900 dark:bg-neutral-100" style={{ width: `${a.percent}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs text-neutral-500">{a.percent}%</span>
                  </div>
                ))}
              </div>
            )}
          </Link>
        </div>
      )}
    </main>
  );
}
