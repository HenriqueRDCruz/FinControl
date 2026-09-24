'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { creditCardSchema, CreditCardFormValues } from '@/lib/validations/credit-card.schema';
import {
  listCreditCards,
  createCreditCard,
  archiveCreditCard,
  getCurrentInvoice,
  getLimitUsage,
  CreditCard,
  Invoice,
  LimitUsage,
} from '@/lib/api/credit-cards';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type LoadState = 'loading' | 'ready' | 'error';

interface CardWithDetails extends CreditCard {
  invoice?: Invoice;
  limit?: LimitUsage;
}

export default function CreditCardsPage() {
  const [cards, setCards] = useState<CardWithDetails[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [formOpen, setFormOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreditCardFormValues>({ resolver: zodResolver(creditCardSchema) });

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const list = await listCreditCards();
      const withDetails = await Promise.all(
        list.map(async (card) => {
          const [invoice, limit] = await Promise.all([
            getCurrentInvoice(card.id),
            getLimitUsage(card.id),
          ]);
          return { ...card, invoice, limit };
        }),
      );
      setCards(withDetails);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: CreditCardFormValues) {
    setActionError(null);
    try {
      await createCreditCard(values);
      reset();
      setFormOpen(false);
      await load();
    } catch {
      setActionError('Nao foi possivel salvar o cartao. Tente novamente.');
    }
  }

  async function handleArchive(id: string) {
    setActionError(null);
    try {
      await archiveCreditCard(id);
      await load();
    } catch {
      setActionError('Nao foi possivel arquivar o cartao. Tente novamente.');
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-neutral-500 hover:underline">
            ← Inicio
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Cartoes</h1>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          {formOpen ? 'Cancelar' : '+ Novo cartao'}
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
              Nome do cartao
            </label>
            <input
              id="name"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              {...register('name')}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="limitAmount" className="block text-sm font-medium">
              Limite (R$)
            </label>
            <input
              id="limitAmount"
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              {...register('limitAmount')}
            />
            {errors.limitAmount && (
              <p className="mt-1 text-sm text-red-600">{errors.limitAmount.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="closingDay" className="block text-sm font-medium">
                Dia de fechamento
              </label>
              <input
                id="closingDay"
                type="number"
                min={1}
                max={31}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                {...register('closingDay')}
              />
              {errors.closingDay && (
                <p className="mt-1 text-sm text-red-600">{errors.closingDay.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="dueDay" className="block text-sm font-medium">
                Dia de vencimento
              </label>
              <input
                id="dueDay"
                type="number"
                min={1}
                max={31}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                {...register('dueDay')}
              />
              {errors.dueDay && <p className="mt-1 text-sm text-red-600">{errors.dueDay.message}</p>}
            </div>
          </div>

          {actionError && <p className="text-sm text-red-600">{actionError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isSubmitting ? 'Salvando…' : 'Salvar cartao'}
          </button>
        </form>
      )}

      {loadState === 'loading' && (
        <p className="py-8 text-center text-sm text-neutral-500">Carregando…</p>
      )}

      {loadState === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            Nao foi possivel carregar seus cartoes.
          </p>
          <button onClick={load} className="mt-2 text-sm text-red-700 underline dark:text-red-300">
            Tentar novamente
          </button>
        </div>
      )}

      {loadState === 'ready' && cards.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">Nenhum cartao cadastrado ainda.</p>
        </div>
      )}

      {actionError && loadState === 'ready' && (
        <p className="mb-3 text-sm text-red-600">{actionError}</p>
      )}

      {loadState === 'ready' && cards.length > 0 && (
        <ul className="space-y-4">
          {cards.map((card) => {
            const usagePercent = card.limit
              ? Math.min(100, Math.round((card.limit.used / card.limit.limitAmount) * 100))
              : 0;
            return (
              <li
                key={card.id}
                className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium">{card.name}</p>
                    <p className="text-xs text-neutral-500">
                      Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                    </p>
                  </div>
                  {archivingId === card.id ? (
                    <span className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => handleArchive(card.id)}
                        className="text-red-600 hover:underline"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setArchivingId(null)}
                        className="text-neutral-500 hover:underline"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setArchivingId(card.id)}
                      className="text-sm text-neutral-400 hover:text-red-600"
                    >
                      Arquivar
                    </button>
                  )}
                </div>

                {card.limit && (
                  <div className="mb-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full bg-neutral-900 dark:bg-neutral-100"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-neutral-500">
                      <span>Usado: {currencyFormatter.format(card.limit.used)}</span>
                      <span>Disponivel: {currencyFormatter.format(card.limit.available)}</span>
                    </div>
                  </div>
                )}

                {card.invoice && (
                  <div className="rounded-md bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
                    <p className="font-medium">
                      Fatura atual ({card.invoice.month}/{card.invoice.year}):{' '}
                      {currencyFormatter.format(card.invoice.total)}
                    </p>
                    {card.invoice.items.length === 0 && (
                      <p className="mt-1 text-neutral-500">Nenhum lancamento nesta fatura.</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
