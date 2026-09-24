'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { getCurrentNetWorth, getNetWorthHistory, NetWorthSnapshot } from '@/lib/api/net-worth';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
});

type LoadState = 'loading' | 'ready' | 'error';

export default function NetWorthPage() {
  const [current, setCurrent] = useState<NetWorthSnapshot | null>(null);
  const [history, setHistory] = useState<NetWorthSnapshot[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const currentSnapshot = await getCurrentNetWorth();
      const historyList = await getNetWorthHistory(90);
      setCurrent(currentSnapshot);
      setHistory(historyList);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    netWorth: h.netWorth,
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Inicio
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Patrimonio</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Calculado automaticamente a partir da sua renda, gastos e investimentos.
        </p>
      </div>

      {loadState === 'loading' && (
        <p className="py-8 text-center text-sm text-neutral-500">Carregando…</p>
      )}

      {loadState === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            Nao foi possivel calcular seu patrimonio.
          </p>
          <button onClick={load} className="mt-2 text-sm text-red-700 underline dark:text-red-300">
            Tentar novamente
          </button>
        </div>
      )}

      {loadState === 'ready' && current && (
        <>
          <div className="mb-6 rounded-lg border border-neutral-200 p-6 text-center dark:border-neutral-800">
            <p className="text-xs text-neutral-500">Patrimonio liquido</p>
            <p
              className={`text-3xl font-semibold ${current.netWorth >= 0 ? '' : 'text-red-600 dark:text-red-400'}`}
            >
              {currencyFormatter.format(current.netWorth)}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
              <div>
                <p className="text-xs text-neutral-500">Renda acumulada</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">
                  {currencyFormatter.format(current.totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Gastos acumulados</p>
                <p className="font-medium text-red-600 dark:text-red-400">
                  {currencyFormatter.format(current.totalExpenses)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Investimentos</p>
                <p className="font-medium">{currencyFormatter.format(current.totalInvestments)}</p>
              </div>
            </div>
          </div>

          {chartData.length < 2 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
              <p className="text-sm text-neutral-500">
                Ainda nao ha historico suficiente para o grafico de evolucao — volte em outro dia
                para ver a curva do seu patrimonio.
              </p>
            </div>
          ) : (
            <div className="h-64 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="mb-2 text-xs text-neutral-500">Evolucao patrimonial</p>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => compactCurrencyFormatter.format(v)}
                    width={60}
                  />
                  <Tooltip formatter={(v: number) => currencyFormatter.format(v)} />
                  <Line type="monotone" dataKey="netWorth" stroke="#0f172a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </main>
  );
}
