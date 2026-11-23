import Link from 'next/link';
import { Guilloche } from '@/components/Guilloche';
import { CardIcon, ExpenseIcon, IncomeIcon, LandmarkIcon, TrendIcon, UploadIcon } from '@/components/icons';

const modules = [
  {
    href: '/incomes',
    title: 'Renda',
    description: 'Salários, freelas e tudo o que entra na conta.',
    Icon: IncomeIcon,
    span: 'md:col-span-3',
    tile: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400',
    badge: 'bg-emerald-600 text-white',
  },
  {
    href: '/expenses',
    title: 'Gastos',
    description: 'Despesas por categoria e forma de pagamento.',
    Icon: ExpenseIcon,
    span: 'md:col-span-3',
    tile: 'border-red-200 bg-red-50 hover:border-red-400',
    badge: 'bg-red-600 text-white',
  },
  {
    href: '/credit-cards',
    title: 'Cartões',
    description: 'Limites, ciclos e faturas.',
    Icon: CardIcon,
    span: 'md:col-span-2',
    tile: 'border-indigo-200 bg-indigo-50 hover:border-indigo-400',
    badge: 'bg-indigo-600 text-white',
  },
  {
    href: '/investments',
    title: 'Investimentos',
    description: 'Sua carteira por tipo de ativo.',
    Icon: TrendIcon,
    span: 'md:col-span-2',
    tile: 'border-gold-200 bg-gold-50 hover:border-gold-400',
    badge: 'bg-gold-400 text-neutral-900',
  },
  {
    href: '/net-worth',
    title: 'Patrimônio',
    description: 'Quanto você tem de fato, mês a mês.',
    Icon: LandmarkIcon,
    span: 'md:col-span-2',
    tile: 'border-neutral-200 bg-neutral-100 hover:border-neutral-400',
    badge: 'bg-neutral-900 text-white',
  },
  {
    href: '/import',
    title: 'Importar extrato',
    description: 'Envie o arquivo do banco (OFX ou CSV) e o sistema separa renda, gastos e cartão para você revisar.',
    Icon: UploadIcon,
    span: 'md:col-span-6',
    tile: 'border-dashed border-neutral-300 bg-white hover:border-indigo-400',
    badge: 'bg-indigo-600 text-white',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <section className="relative overflow-hidden rounded-2xl bg-indigo-800 px-6 py-10 text-white sm:px-10 sm:py-14">
        <Guilloche
          id="g-home"
          className="pointer-events-none absolute -right-60 -top-36 h-[30rem] w-[30rem] text-indigo-200 opacity-30 sm:-right-44 sm:-top-32 sm:h-[38rem] sm:w-[38rem] sm:opacity-100"
          opacity={0.5}
        />
        <div className="relative max-w-lg">
          <h1 className="font-display text-4xl font-semibold text-balance sm:text-5xl">Seu dinheiro, em um só lugar</h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-indigo-100">
            Veja o mês de relance no dashboard ou vá direto ao módulo que você quer atualizar.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center rounded-lg bg-gold-300 px-5 py-3 text-sm font-semibold text-neutral-950 hover:bg-gold-200"
          >
            Abrir dashboard
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-6" aria-label="Módulos">
        {modules.map(({ href, title, description, Icon, span, tile, badge }) => (
          <Link
            key={href}
            href={href}
            className={`group flex items-start gap-4 rounded-xl border p-5 ${span} ${tile}`}
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${badge}`}>
              <Icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-display text-xl font-semibold">{title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-neutral-600">{description}</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
