'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listCreditCards, CreditCard } from '@/lib/api/credit-cards';
import { importStatement, ImportItem, ImportResult } from '@/lib/api/statements';
import { ApiError } from '@/lib/api/client';
import { decodeBytes, parseStatement, ParsedEntry } from '@/lib/statements/parser';
import {
  looksInternal,
  suggestExpenseCategory,
  suggestIncomeSource,
} from '@/lib/statements/categorize';
import { expenseCategoryOptions } from '@/lib/validations/expense.schema';
import { incomeSourceOptions } from '@/lib/validations/income.schema';
import { formatDate } from '@/lib/format';
import { UploadIcon } from '@/components/icons';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type Mode = 'account' | 'card';
type Kind = 'INCOME' | 'EXPENSE' | 'IGNORE';

interface Row {
  id: number;
  date: string;
  description: string;
  amount: number; // sempre positivo
  kind: Kind;
  category: string;
  source: string;
  note?: string;
}

type Override = Partial<Pick<Row, 'kind' | 'category' | 'source'>>;

const MAX_FILE_BYTES = 2_000_000;
const MAX_ENTRIES = 1000;

/** Transforma o que veio do arquivo em linhas sugeridas (o usuário ajusta depois). */
function buildRows(entries: ParsedEntry[], mode: Mode, invert: boolean): Row[] {
  const signed = entries.map((e) => (invert ? -e.amount : e.amount));

  // Fatura de cartão: o sinal que mais aparece são as compras; o outro lado são pagamentos/estornos.
  let purchaseSign = -1;
  if (mode === 'card') {
    const positives = signed.filter((a) => a > 0).length;
    purchaseSign = positives > signed.length - positives ? 1 : -1;
  }

  return entries.map((entry, i) => {
    const amount = signed[i];
    let kind: Kind;
    let note: string | undefined;

    if (mode === 'card') {
      kind = Math.sign(amount) === purchaseSign ? 'EXPENSE' : 'IGNORE';
      if (kind === 'IGNORE') note = 'Pagamento ou estorno da fatura';
    } else {
      kind = amount < 0 ? 'EXPENSE' : 'INCOME';
    }

    if (looksInternal(entry.description)) {
      kind = 'IGNORE';
      note = 'Movimentação interna (não conta como renda nem gasto)';
    }

    return {
      id: i,
      date: entry.date,
      description: entry.description,
      amount: Math.abs(amount),
      kind,
      category: suggestExpenseCategory(entry.description),
      source: suggestIncomeSource(entry.description),
      note,
    };
  });
}

const selectClass =
  'w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-600';

export default function ImportPage() {
  const [mode, setMode] = useState<Mode>('account');
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [cardId, setCardId] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [entries, setEntries] = useState<ParsedEntry[] | null>(null);
  const [ignoredLines, setIgnoredLines] = useState(0);
  const [invert, setInvert] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    listCreditCards()
      .then((list) => {
        const active = list.filter((c) => !c.archived);
        setCards(active);
        if (active.length === 1) setCardId(active[0].id);
      })
      .catch(() => setCards([]));
  }, []);

  const rows = useMemo(() => {
    if (!entries) return [];
    return buildRows(entries, mode, invert).map((row) => ({ ...row, ...overrides[row.id] }));
  }, [entries, mode, invert, overrides]);

  const summary = useMemo(() => {
    const s = { income: 0, incomeTotal: 0, expense: 0, expenseTotal: 0, ignored: 0 };
    for (const r of rows) {
      if (r.kind === 'INCOME') [s.income, s.incomeTotal] = [s.income + 1, s.incomeTotal + r.amount];
      else if (r.kind === 'EXPENSE') [s.expense, s.expenseTotal] = [s.expense + 1, s.expenseTotal + r.amount];
      else s.ignored++;
    }
    return s;
  }, [rows]);

  const importCount = summary.income + summary.expense;
  const needsCard = mode === 'card' && summary.expense > 0 && !cardId;

  function update(id: number, patch: Override) {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function reset() {
    setEntries(null);
    setFileName(null);
    setOverrides({});
    setError(null);
    setResult(null);
    setInvert(false);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (/\.pdf$/i.test(file.name)) {
      setError('PDF não é suportado. No site ou app do banco, procure exportar o extrato em OFX ou CSV.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Arquivo muito grande (máximo 2 MB). Exporte um período menor.');
      return;
    }

    try {
      const parsed = parseStatement(decodeBytes(await file.arrayBuffer()));
      if (parsed.entries.length === 0) {
        setError('Não encontrei lançamentos neste arquivo. Envie o extrato do banco em OFX ou CSV.');
        return;
      }
      if (parsed.entries.length > MAX_ENTRIES) {
        setError(`O arquivo tem mais de ${MAX_ENTRIES} lançamentos. Exporte por períodos menores.`);
        return;
      }
      setEntries(parsed.entries);
      setIgnoredLines(parsed.ignoredLines);
      setFileName(file.name);
      setOverrides({});
      setInvert(false);
    } catch {
      setError('Não consegui ler este arquivo.');
    }
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const items: ImportItem[] = rows
        .filter((r) => r.kind !== 'IGNORE')
        .map((r) => {
          const base = {
            date: r.date,
            description: r.description.slice(0, 200),
            amount: Math.round(r.amount * 100) / 100,
          };
          return r.kind === 'INCOME'
            ? { ...base, type: 'INCOME', source: r.source }
            : {
                ...base,
                type: 'EXPENSE',
                category: r.category,
                creditCardId: mode === 'card' ? cardId : undefined,
              };
        });
      setResult(await importStatement(items));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status !== 401
          ? err.message
          : 'Não foi possível importar agora. Tente de novo: o que já foi gravado não será duplicado.',
      );
    } finally {
      setImporting(false);
    }
  }

  const header = (
    <div className="mb-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">Importar extrato</h1>
      <p className="mt-2 max-w-2xl text-neutral-500">
        Envie o arquivo do seu banco. O sistema separa renda, gastos e cartão e sugere as categorias; você revisa antes
        de gravar.
      </p>
    </div>
  );

  // ---------- resultado ----------
  if (result) {
    const created = result.createdIncomes + result.createdExpenses;
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        {header}
        <div className="max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="font-display text-2xl font-semibold text-emerald-800">
            {created > 0 ? 'Extrato importado' : 'Nada novo para importar'}
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-emerald-900">
            <li>{result.createdIncomes} renda(s) criada(s)</li>
            <li>{result.createdExpenses} gasto(s) criado(s)</li>
            {result.skippedDuplicates > 0 && (
              <li>{result.skippedDuplicates} já existia(m) e foi(ram) ignorado(s), sem duplicar</li>
            )}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/expenses" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Ver gastos
            </Link>
            <Link href="/incomes" className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Ver renda
            </Link>
            <button onClick={reset} className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Importar outro arquivo
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- escolha do arquivo ----------
  if (!entries) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        {header}

        <div className="max-w-2xl space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">O que você vai importar?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['account', 'Extrato da conta', 'Entradas viram renda e saídas viram gastos.'],
                  ['card', 'Fatura do cartão', 'As compras entram na fatura do cartão escolhido.'],
                ] as const
              ).map(([value, title, text]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border p-4 ${
                    mode === value ? 'border-indigo-600 bg-indigo-50' : 'border-neutral-200 bg-white hover:border-neutral-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                    className="sr-only"
                  />
                  <span className="block font-semibold">{title}</span>
                  <span className="mt-1 block text-sm text-neutral-600">{text}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {mode === 'card' && (
            <div>
              <label htmlFor="card" className="mb-1 block text-sm font-medium">
                Cartão da fatura
              </label>
              {cards.length === 0 ? (
                <p className="text-sm text-neutral-600">
                  Você ainda não tem cartão cadastrado.{' '}
                  <Link href="/credit-cards" className="text-blue-600 hover:underline">
                    Cadastre um cartão
                  </Link>{' '}
                  para que os gastos caiam na fatura certa.
                </p>
              ) : (
                <select id="card" value={cardId} onChange={(e) => setCardId(e.target.value)} className={`${selectClass} max-w-xs`}>
                  <option value="">Escolha o cartão</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center ${
                dragging ? 'border-indigo-600 bg-indigo-50' : 'border-neutral-300 bg-white hover:border-indigo-400'
              }`}
            >
              <UploadIcon className="h-9 w-9 text-indigo-600" />
              <span className="mt-3 font-semibold">Arraste o arquivo aqui ou clique para escolher</span>
              <span className="mt-1 text-sm text-neutral-500">OFX ou CSV, até 2 MB</span>
              <input
                type="file"
                accept=".ofx,.csv,.txt,.pdf,text/csv"
                className="sr-only"
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <details className="text-sm text-neutral-600">
            <summary className="cursor-pointer font-medium text-neutral-800">Como consigo esse arquivo?</summary>
            <p className="mt-2 leading-relaxed">
              No internet banking ou no app do seu banco, abra o extrato (ou a fatura do cartão) e procure a opção{' '}
              <em>exportar</em> ou <em>baixar</em>. Escolha o formato <strong>OFX</strong> (o mais completo) ou{' '}
              <strong>CSV</strong>. O arquivo é lido aqui no seu navegador e só o que você confirmar é enviado.
            </p>
          </details>
        </div>
      </main>
    );
  }

  // ---------- prévia para revisar ----------
  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:pt-10">
      {header}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-900">{fileName}</span> · {rows.length} lançamentos lidos
          {ignoredLines > 0 && ` · ${ignoredLines} linha(s) do arquivo não eram lançamentos`}
        </p>
        <button onClick={reset} className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50">
          Trocar arquivo
        </button>
      </div>

      {mode === 'card' && (
        <div className="mb-4 max-w-sm">
          <label htmlFor="card2" className="mb-1 block text-sm font-medium">
            Cartão da fatura
          </label>
          <select id="card2" value={cardId} onChange={(e) => setCardId(e.target.value)} className={selectClass}>
            <option value="">Escolha o cartão</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4 grid divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <p className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Renda · {summary.income}
          </p>
          <p className="mt-1 text-xl font-semibold text-emerald-700">{currency.format(summary.incomeTotal)}</p>
        </div>
        <div className="p-4">
          <p className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
            Gastos · {summary.expense}
          </p>
          <p className="mt-1 text-xl font-semibold text-red-600">{currency.format(summary.expenseTotal)}</p>
        </div>
        <div className="bg-neutral-50 p-4">
          <p className="text-sm text-neutral-500">Ignorados · {summary.ignored}</p>
          <p className="mt-1 text-sm text-neutral-600">Não serão importados</p>
        </div>
      </div>

      <label className="mb-3 flex cursor-pointer items-start gap-2 text-sm text-neutral-600">
        <input
          type="checkbox"
          checked={invert}
          onChange={(e) => {
            setInvert(e.target.checked);
            setOverrides({});
          }}
          className="mt-0.5 h-4 w-4 accent-indigo-600"
        />
        <span>
          Entradas e saídas parecem trocadas? Marque para inverter. <span className="text-neutral-500">(Ajustes manuais são refeitos.)</span>
        </span>
      </label>

      <ul className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {rows.map((row) => (
          <li
            key={row.id}
            className={`grid gap-2 border-b border-neutral-200 px-4 py-3 last:border-b-0 sm:grid-cols-[4.5rem_1fr_7.5rem_8rem_11rem] sm:items-center sm:gap-3 ${
              row.kind === 'IGNORE' ? 'bg-neutral-50' : ''
            }`}
          >
            <span className="text-sm text-neutral-500">{formatDate(row.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
            <span className="min-w-0">
              <span className={`block truncate text-sm font-medium ${row.kind === 'IGNORE' ? 'text-neutral-500' : ''}`} title={row.description}>
                {row.description}
              </span>
              {row.note && row.kind === 'IGNORE' && <span className="block text-xs text-neutral-500">{row.note}</span>}
            </span>
            <span
              className={`text-sm font-semibold sm:text-right ${
                row.kind === 'INCOME' ? 'text-emerald-700' : row.kind === 'EXPENSE' ? 'text-red-600' : 'text-neutral-400'
              }`}
            >
              {row.kind === 'INCOME' ? '+' : row.kind === 'EXPENSE' ? '−' : ''}
              {currency.format(row.amount)}
            </span>
            <div className="flex gap-2 sm:contents">
              <select
                aria-label={`Tipo de ${row.description}`}
                value={row.kind}
                onChange={(e) => update(row.id, { kind: e.target.value as Kind })}
                className={selectClass}
              >
                <option value="INCOME">Renda</option>
                <option value="EXPENSE">Gasto</option>
                <option value="IGNORE">Ignorar</option>
              </select>
              {row.kind === 'EXPENSE' ? (
                <select
                  aria-label={`Categoria de ${row.description}`}
                  value={row.category}
                  onChange={(e) => update(row.id, { category: e.target.value })}
                  className={selectClass}
                >
                  {expenseCategoryOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : row.kind === 'INCOME' ? (
                <select
                  aria-label={`Origem de ${row.description}`}
                  value={row.source}
                  onChange={(e) => update(row.id, { source: e.target.value })}
                  className={selectClass}
                >
                  {incomeSourceOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="hidden sm:block" />
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="text-sm">
            {error ? (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            ) : needsCard ? (
              <p className="text-neutral-600">Escolha o cartão da fatura para continuar.</p>
            ) : (
              <p className="text-neutral-600">
                {importCount} lançamento(s) serão importados. Os que já existem são ignorados.
              </p>
            )}
          </div>
          <button
            onClick={handleImport}
            disabled={importing || importCount === 0 || needsCard}
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {importing ? 'Importando…' : `Importar ${importCount} lançamento(s)`}
          </button>
        </div>
      </div>
    </main>
  );
}
