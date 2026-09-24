import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-5 overflow-hidden px-6 py-12 text-center">
      <div className="absolute -top-32 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden="true" />
      <p className="relative text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">Visão financeira</p>
      <h1 className="relative max-w-xl text-3xl font-bold tracking-tight sm:text-5xl">Plataforma de Gestao Financeira Pessoal</h1>
      <p className="relative max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
        Os 8 modulos do MVP estao prontos.
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        Ir para o Dashboard
      </Link>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/incomes" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Renda
        </Link>
        <Link href="/expenses" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Gastos
        </Link>
        <Link href="/credit-cards" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Cartoes
        </Link>
        <Link href="/investments" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Investimentos
        </Link>
        <Link href="/net-worth" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Patrimonio
        </Link>
      </div>
    </main>
  );
}
