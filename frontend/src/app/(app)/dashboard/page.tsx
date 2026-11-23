'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Guilloche } from '@/components/Guilloche';
import { getDashboardOverview, DashboardOverview } from '@/lib/api/dashboard';
import { getQuotes, QuotesResponse } from '@/lib/api/quotes';
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
  const [quotes, setQuotes] = useState<QuotesResponse | null>(null);
  const [quotesFailed, setQuotesFailed] = useState(false);

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

  // Cotações vêm de uma API externa e carregam à parte: se falharem, o resto do dashboard segue normal.
  useEffect(() => {
    getQuotes()
      .then(setQuotes)
      .catch(() => setQuotesFailed(true));
  }, []);

  const trendData = data?.trend.map((t) => ({
    label: `${MONTH_ABBR[t.month - 1]}/${String(t.year).slice(2)}`,
    Receitas: t.income,
    Despesas: t.expenses,
  }));

  const saldo = data ? data.currentMonth.income - data.currentMonth.expenses : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold sm:text-4xl">Dashboard</h1>
        <p className="mt-2 text-neutral-500">Como está o seu dinheiro este mês.</p>
      </div>

      {loadState === 'loading' && (
        <p className="py-8 text-center text-sm text-neutral-500">Carregando…</p>
      )}

      {loadState === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-700">Não foi possível carregar o dashboard.</p>
          <button onClick={load} className="mt-2 text-sm font-medium text-red-700 underline">
            Tentar novamente
          </button>
        </div>
      )}

      {loadState === 'ready' && data && (
        <div className="space-y-5">
          {/* Patrimônio e taxa de economia */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Link
              href="/net-worth"
              className="relative overflow-hidden rounded-2xl bg-indigo-800 p-6 text-white hover:bg-indigo-700 sm:p-8 lg:col-span-2"
            >
              <Guilloche
                id="g-dash"
                className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 text-indigo-200 opacity-30 sm:opacity-100"
                opacity={0.5}
              />
              <p className="relative text-sm text-indigo-100">Patrimônio líquido</p>
              <p className="relative mt-2 font-display text-4xl font-semibold sm:text-5xl">
                {currencyFormatter.format(data.netWorth.netWorth)}
              </p>
              <p className="relative mt-6 text-sm font-medium text-gold-300">Ver evolução</p>
            </Link>

            <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6">
              <p className="text-sm text-neutral-500">Taxa de economia do mês</p>
              <p
                className={`mt-4 font-display text-5xl font-semibold ${
                  data.currentMonth.savingsRate >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {data.currentMonth.savingsRate.toFixed(1).replace(".", ",")}%
              </p>
              <p className="mt-3 text-sm text-neutral-500">
                {data.currentMonth.savingsRate >= 0
                  ? 'Você está guardando parte do que ganha.'
                  : 'Você gastou mais do que ganhou neste mês.'}
              </p>
            </div>
          </div>

          {/* Entradas, saídas e saldo: uma única faixa, três colunas */}
          <div className="grid divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              <p className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Receitas do mês
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {currencyFormatter.format(data.currentMonth.income)}
              </p>
            </div>
            <div className="p-5">
              <p className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
                Despesas do mês
              </p>
              <p className="mt-2 text-2xl font-semibold text-red-600">
                {currencyFormatter.format(data.currentMonth.expenses)}
              </p>
            </div>
            <div className="bg-neutral-50 p-5">
              <p className="text-sm text-neutral-500">Saldo do mês</p>
              <p className={`mt-2 text-2xl font-semibold ${saldo >= 0 ? 'text-neutral-900' : 'text-red-600'}`}>
                {currencyFormatter.format(saldo)}
              </p>
            </div>
          </div>

          {/* Cotações (API externa) e patrimônio convertido */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">Cotações</h2>
              {quotes && (
                <span className="text-xs text-neutral-500">
                  {quotes.stale ? 'Última consulta disponível, ' : ''}
                  atualizado às{' '}
                  {new Date(quotes.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {quotes ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {quotes.items.map((q) => (
                    <div key={q.code}>
                      <p className="text-sm text-neutral-500">{q.name}</p>
                      <p className="mt-1 text-xl font-semibold">{currencyFormatter.format(q.bid)}</p>
                      <p className={`text-sm font-medium ${q.pctChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {q.pctChange >= 0 ? '+' : '−'}
                        {Math.abs(q.pctChange).toFixed(2).replace('.', ',')}% hoje
                      </p>
                    </div>
                  ))}
                </div>
                {(() => {
                  const usd = quotes.items.find((q) => q.code === 'USD');
                  const eur = quotes.items.find((q) => q.code === 'EUR');
                  if (!usd && !eur) return null;
                  return (
                    <div className="mt-5 grid gap-3 border-t border-neutral-200 pt-4 text-sm sm:grid-cols-2">
                      {usd && (
                        <p className="text-neutral-600">
                          Seu patrimônio em dólar:{' '}
                          <span className="font-semibold text-neutral-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(
                              data.netWorth.netWorth / usd.bid,
                            )}
                          </span>
                        </p>
                      )}
                      {eur && (
                        <p className="text-neutral-600">
                          Seu patrimônio em euro:{' '}
                          <span className="font-semibold text-neutral-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(
                              data.netWorth.netWorth / eur.bid,
                            )}
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : quotesFailed ? (
              <p className="mt-3 text-sm text-neutral-500">Cotações indisponíveis no momento.</p>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">Carregando cotações…</p>
            )}
          </div>

          {/* Gráfico */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold">Receitas e despesas</h2>
            <p className="text-sm text-neutral-500">Últimos 6 meses</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barGap={4}>
                  <CartesianGrid vertical={false} stroke="#DDE0EE" strokeDasharray="3 4" />
                  <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} stroke="#5D6491" />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="#5D6491"
                    tickFormatter={(v) => compactCurrencyFormatter.format(v)}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v: number) => currencyFormatter.format(v)}
                    cursor={{ fill: 'rgba(54,67,214,0.06)' }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #DDE0EE', boxShadow: 'none' }}
                  />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="Receitas" fill="#14A896" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#F25A44" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Gastos por categoria */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
              <h2 className="font-semibold">Gastos por categoria</h2>
              <p className="mb-4 text-sm text-neutral-500">Mês atual</p>
              {data.expensesByCategory.length === 0 ? (
                <p className="text-sm text-neutral-500">Nenhum gasto neste mês ainda.</p>
              ) : (
                <div className="space-y-3">
                  {data.expensesByCategory.map((c) => {
                    const max = data.expensesByCategory[0].total;
                    const percent = max > 0 ? Math.round((c.total / max) * 100) : 0;
                    return (
                      <div key={c.category} className="text-sm">
                        <div className="mb-1 flex items-baseline justify-between gap-3">
                          <span>{categoryLabel(c.category)}</span>
                          <span className="text-neutral-500">{currencyFormatter.format(c.total)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full bg-red-500" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Investimentos por tipo */}
            <Link
              href="/investments"
              className="block rounded-2xl border border-gold-200 bg-gold-50 p-5 hover:border-gold-400 sm:p-6"
            >
              <h2 className="font-semibold">Investimentos por tipo</h2>
              <p className="mb-4 text-sm text-neutral-600">Como sua carteira está distribuída</p>
              {data.investments.allocation.length === 0 ? (
                <p className="text-sm text-neutral-600">Nenhum investimento cadastrado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {data.investments.allocation.map((a) => (
                    <div key={a.type} className="text-sm">
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span>{typeLabel(a.type)}</span>
                        <span className="text-neutral-600">{a.percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gold-100">
                        <div className="h-full rounded-full bg-gold-500" style={{ width: `${a.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
