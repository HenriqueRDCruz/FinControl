import type { Metadata } from 'next';
import { Bitter, Figtree } from 'next/font/google';
import './globals.css';

// Bitter (serifa robusta) dá voz aos títulos e aos grandes valores; Figtree cuida do texto e da interface.
const display = Bitter({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'FinControl',
  description: 'Renda, gastos, cartões, investimentos e patrimônio em um só lugar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body className="bg-neutral-50 font-sans text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
