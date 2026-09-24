'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  investmentSchema,
  InvestmentFormValues,
  investmentTypeOptions,
} from '@/lib/validations/investment.schema';
import {
  listInvestments,
  getInvestmentSummary,
  createInvestment,
  deleteInvestment,
  Investment,
  InvestmentSummary,
} from '@/lib/api/investments';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function typeLabel(value: string) {
  return investmentTypeOptions.find((o) => o.value === value)?.label ?? value;
}

type LoadState = 'loading' | 'ready' | 'error';

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [formOpen, setFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentSchema),
    defaultValues: { type: 'STOCK' },
  });

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [list, sum] = await Promise.all([listInvestments(), getInvestmentSummary()]);
      setInvestments(list);
      setSummary(sum);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: InvestmentFormValues) {
    setActionError(null);
    try {
      await createInvestment(values);
      reset({ type: 'STOCK', name: '', institution: '', investedAmount: undefined, currentValue: undefined });
      setFormOpen(false);
      await load();
    } catch {
      setActionError('Nao foi possivel salvar o investimento. Tente novamente.');
    }
  }

  async function handleDelete(id: string) {
    setActionError(null);
    try {
      await deleteInvestment(id);
      await load();
    } catch {
      setActionError('Nao foi possivel excluir. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-neutral-500 hover:underline">
            ← Inicio
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Investimentos</h1>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          {formOpen ? 'Cancelar' : '+ Novo investimento'}
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mb-6 space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          noValidate
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Nome do ativo
            </label>
            <input
              id="name"
              placeholder="Ex.: PETR4, Tesouro Selic 2029"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              {...register('name')}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium">
                Tipo
              </label>
              <select
                id="type"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                {...register('type')}
              >
                {investmentTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="institution" className="block text-sm font-medium">
                Instituicao (opcional)
              </label>
              <input
                id="institution"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                {...register('institution')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="investedAmount" className="block text-sm font-medium">
                Valor investido (R$)
              </label>
              <input
                id="investedAmount"
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                {...register('investedAmount')}
              />
              {errors.investedAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.investedAmount.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="currentValue" className="block text-sm font-medium">
                Valor atual (R$)
              </label>
              <input
                id="currentValue"
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                {...register('currentValue')}
              />
              {errors.currentValue && (
                <p className="mt-1 text-sm text-red-600">{errors.currentValue.message}</p>
              )}
            </div>
          </div>

          {actionError && <p className="text-sm text-red-600">{actionError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isSubmitting ? 'Salvando…' : 'Salvar investimento'}
          </button>
        </form>
      )}

      {loadState === 'loading' && (
        <p className="py-8 text-center text-sm text-neutral-500">Carregando…</p>
      )}

      {loadState === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            Nao foi possivel carregar seus investimentos.
          </p>
          <button onClick={load} className="mt-2 text-sm text-red-700 underline dark:text-red-300">
            Tentar novamente
          </button>
        </div>
      )}

      {loadState === 'ready' && investments.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">Nenhum investimento cadastrado ainda.</p>
        </div>
      )}

      {loadState === 'ready' && investments.length > 0 && summary && (
        <>
          <div className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-neutral-500">Investido</p>
                <p className="font-medium">{currencyFormatter.format(summary.totalInvested)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Valor atual</p>
                <p className="font-medium">{currencyFormatter.format(summary.totalCurrent)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Lucro/Prejuizo</p>
                <p
                  className={`font-medium ${summary.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {currencyFormatter.format(summary.profit)} ({summary.profitPercent.toFixed(1)}%)
                </p>
              </div>
            </div>

            {summary.allocation.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-neutral-500">Distribuicao da carteira</p>
                {summary.allocation.map((a) => (
                  <div key={a.type} className="flex items-center gap-2 text-sm">
                    <span className="w-28 shrink-0">{typeLabel(a.type)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full bg-neutral-900 dark:bg-neutral-100"
                        style={{ width: `${a.percent}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs text-neutral-500">
                      {a.percent}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {investments.map((investment) => {
              const profit = investment.currentValue - investment.investedAmount;
              return (
                <li key={investment.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{investment.name}</p>
                    <p className="text-sm text-neutral-500">
                      {typeLabel(investment.type)}
                      {investment.institution ? ` · ${investment.institution}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">{currencyFormatter.format(investment.currentValue)}</p>
                      <p
                        className={`text-xs ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {profit >= 0 ? '+' : ''}
                        {currencyFormatter.format(profit)}
                      </p>
                    </div>
                    {deletingId === investment.id ? (
                      <span className="flex items-center gap-2 text-sm">
                        <button
                          onClick={() => handleDelete(investment.id)}
                          className="text-red-600 hover:underline"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-neutral-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeletingId(investment.id)}
                        className="text-sm text-neutral-400 hover:text-red-600"
                        aria-label={`Excluir ${investment.name}`}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
