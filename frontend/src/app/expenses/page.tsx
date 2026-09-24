'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  expenseSchema,
  ExpenseFormValues,
  expenseCategoryOptions,
  paymentMethodOptions,
} from '@/lib/validations/expense.schema';
import { listExpenses, createExpense, deleteExpense, Expense } from '@/lib/api/expenses';
import { listCreditCards, CreditCard } from '@/lib/api/credit-cards';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

type LoadState = 'loading' | 'ready' | 'error';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [formOpen, setFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: 'OTHER',
      paymentMethod: 'CASH',
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const paymentMethod = useWatch({ control, name: 'paymentMethod' });

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [res, cards] = await Promise.all([listExpenses(), listCreditCards()]);
      setExpenses(res.items);
      setTotal(res.total);
      setCreditCards(cards);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: ExpenseFormValues) {
    setActionError(null);
    try {
      await createExpense(values);
      reset({
        category: 'OTHER',
        paymentMethod: 'CASH',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        amount: undefined,
        installmentCount: undefined,
        creditCardId: undefined,
        notes: '',
      });
      setFormOpen(false);
      await load();
    } catch {
      setActionError('Nao foi possivel salvar o gasto. Tente novamente.');
    }
  }

  async function handleDelete(id: string) {
    setActionError(null);
    try {
      await deleteExpense(id);
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
          <h1 className="mt-1 text-2xl font-semibold">Gastos</h1>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          {formOpen ? 'Cancelar' : '+ Novo gasto'}
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mb-6 space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          noValidate
        >
          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              Descricao
            </label>
            <input
              id="description"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              {...register('description')}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium">
                Valor {paymentMethod === 'CREDIT_CARD' ? 'total da compra (R$)' : '(R$)'}
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
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
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                {...register('date')}
              />
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium">
                Categoria
              </label>
              <select
                id="category"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                {...register('category')}
              >
                {expenseCategoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium">
                Forma de pagamento
              </label>
              <select
                id="paymentMethod"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                {...register('paymentMethod')}
              >
                {paymentMethodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {paymentMethod === 'CREDIT_CARD' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="installmentCount" className="block text-sm font-medium">
                  Numero de parcelas
                </label>
                <input
                  id="installmentCount"
                  type="number"
                  min={1}
                  max={48}
                  defaultValue={1}
                  className="mt-1 w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  {...register('installmentCount')}
                />
                {errors.installmentCount && (
                  <p className="mt-1 text-sm text-red-600">{errors.installmentCount.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="creditCardId" className="block text-sm font-medium">
                  Cartao (opcional)
                </label>
                <select
                  id="creditCardId"
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  {...register('creditCardId')}
                >
                  <option value="">Sem vinculo com um cartao cadastrado</option>
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
                {creditCards.length === 0 && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Voce ainda nao tem cartoes cadastrados —{' '}
                    <Link href="/credit-cards" className="text-blue-600 hover:underline">
                      cadastre um
                    </Link>{' '}
                    para ver a fatura calculada com o fechamento real.
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium">
              Observacao (opcional)
            </label>
            <input
              id="notes"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              {...register('notes')}
            />
          </div>

          {actionError && <p className="text-sm text-red-600">{actionError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isSubmitting ? 'Salvando…' : 'Salvar gasto'}
          </button>
        </form>
      )}

      {loadState === 'loading' && (
        <p className="py-8 text-center text-sm text-neutral-500">Carregando…</p>
      )}

      {loadState === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            Nao foi possivel carregar seus gastos.
          </p>
          <button onClick={load} className="mt-2 text-sm text-red-700 underline dark:text-red-300">
            Tentar novamente
          </button>
        </div>
      )}

      {loadState === 'ready' && expenses.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">Nenhum gasto cadastrado ainda.</p>
        </div>
      )}

      {loadState === 'ready' && expenses.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between text-sm text-neutral-500">
            <span>{expenses.length} lancamento(s)</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              Total: {currencyFormatter.format(total)}
            </span>
          </div>

          {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {expense.description}
                    {expense.installmentCount && expense.installmentCount > 1 && (
                      <span className="ml-2 text-xs text-neutral-500">
                        {expense.installmentNumber}/{expense.installmentCount}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {new Date(expense.date).toLocaleDateString('pt-BR')} ·{' '}
                    {expenseCategoryOptions.find((o) => o.value === expense.category)?.label}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{currencyFormatter.format(expense.amount)}
                  </span>
                  {deletingId === expense.id ? (
                    <span className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => handleDelete(expense.id)}
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
                      onClick={() => setDeletingId(expense.id)}
                      className="text-sm text-neutral-400 hover:text-red-600"
                      aria-label={`Excluir ${expense.description}`}
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
