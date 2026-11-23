import Link from 'next/link';

// Marca: duas moedas concêntricas em ouro + nome em serifa.
export function Wordmark({ className = '', href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 28 28" className="h-7 w-7 text-gold-300" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="14" cy="14" r="12" strokeWidth="1.6" />
        <circle cx="14" cy="14" r="7.5" strokeWidth="1.6" />
        <circle cx="14" cy="14" r="2.5" fill="currentColor" stroke="none" />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight">FinControl</span>
    </Link>
  );
}
