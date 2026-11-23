'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  incomeSchema,
  IncomeFormValues,
  incomeSourceOptions,
} from '@/lib/validations/income.schema';
import { formatDate, todayISO } from '@/lib/format';
import { listIncomes, createIncome, deleteIncome, Income } from '@/lib/api/incomes';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

type LoadState = 'loading' | 'ready' | 'error';

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [formOpen, setFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { source: 'OTHER', date: todayISO() },
  });

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const res = await listIncomes();
      setIncomes(res.items);
      setTotal(res.total);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: IncomeFormValues) {
    setActionError(null);
    try {
      await createIncome(values);
      reset({ source: 'OTHER', date: todayISO(), description: '', amount: undefined, notes: '' });
      setFormOpen(false);
      await load();
    } catch {
      setActionError('Não foi possível salvar a renda. Tente novamente.');
    }
  }

  async function handleDelete(id: string) {
    setActionError(null);
    try {
      await deleteIncome(id);
      await load();
    } catch {
      setActionError('Não foi possível excluir. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Renda</h1>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-md bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white"
        >
          {formOpen ? 'Cancelar' : '+ Nova renda'}
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mb-6 max-w-xl space-y-4 rounded-xl border border-neutral-200 p-5"
          noValidate
        >
          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              Descrição
            </label>
            <input
              id="description"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              {...register('description')}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium">
                Valor (R$)
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                {...register('amount')}
              />
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium">
                Data
              </label>
              <input
                id="date"
                type="date"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                {...register('date')}
              />
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="source" className="block text-sm font-medium">
              Origem
            </label>
            <select
              id="source"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              {...register('source')}
            >
              {incomeSourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium">
              Observação (opcional)
            </label>
            <input
              id="notes"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              {...register('notes')}
            />
          </div>

          {actionError && <p className="text-sm text-red-600">{actionError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando…' : 'Salvar renda'}
          </button>
        </form>
      )}

      {loadState === 'loading' && (
        <p className="py-8 text-center text-sm text-neutral-500">Carregando…</p>
      )}

      {loadState === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-700">
            Não foi possível carregar suas rendas.
          </p>
          <button onClick={load} className="mt-2 text-sm text-red-700 underline">
            Tentar novamente
          </button>
        </div>
      )}

      {loadState === 'ready' && incomes.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">Nenhuma renda cadastrada ainda.</p>
        </div>
      )}

      {loadState === 'ready' && incomes.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between text-sm text-neutral-500">
            <span>{incomes.length} lançamento(s)</span>
            <span className="font-medium text-neutral-900">
              Total: {currencyFormatter.format(total)}
            </span>
          </div>

          {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {incomes.map((income) => (
              <li key={income.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{income.description}</p>
                  <p className="text-sm text-neutral-500">
                    {formatDate(income.date)} ·{' '}
                    {incomeSourceOptions.find((o) => o.value === income.source)?.label}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-emerald-600">
                    {currencyFormatter.format(income.amount)}
                  </span>
                  {deletingId === income.id ? (
                    <span className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => handleDelete(income.id)}
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
                      onClick={() => setDeletingId(income.id)}
                      className="text-sm text-neutral-400 hover:text-red-600"
                      aria-label={`Excluir ${income.description}`}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
