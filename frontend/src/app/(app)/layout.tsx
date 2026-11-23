'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ensureSession, setAccessToken, setSessionExpiredHandler } from '@/lib/api/client';
import { logoutRequest } from '@/lib/api/auth';
import { Wordmark } from '@/components/Wordmark';
import {
  CardIcon,
  CloseIcon,
  DashboardIcon,
  ExpenseIcon,
  HomeIcon,
  IncomeIcon,
  LandmarkIcon,
  LogoutIcon,
  MenuIcon,
  TrendIcon,
  UploadIcon,
} from '@/components/icons';

const NAV = [
  { href: '/', label: 'Início', Icon: HomeIcon },
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/incomes', label: 'Renda', Icon: IncomeIcon },
  { href: '/expenses', label: 'Gastos', Icon: ExpenseIcon },
  { href: '/credit-cards', label: 'Cartões', Icon: CardIcon },
  { href: '/investments', label: 'Investimentos', Icon: TrendIcon },
  { href: '/net-worth', label: 'Patrimônio', Icon: LandmarkIcon },
  { href: '/import', label: 'Importar extrato', Icon: UploadIcon },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Layout de todas as paginas protegidas. Sem sessao valida, nada e renderizado:
 * o visitante e enviado para /register.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    ensureSession().then((ok) => {
      if (cancelled) return;
      if (ok) {
        setChecking(false);
      } else {
        router.replace('/register');
      }
    });

    // Se a sessao expirar no meio do uso, volta para o cadastro (de la da para ir ao login).
    setSessionExpiredHandler(() => router.replace('/register'));

    return () => {
      cancelled = true;
      setSessionExpiredHandler(null);
    };
  }, [router]);

  // Fecha o menu do celular ao trocar de página.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutRequest();
    } catch {
      // Mesmo que a API falhe, a sessao local e encerrada abaixo.
    } finally {
      setAccessToken(null);
      router.replace('/login');
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">Verificando sua sessão…</p>
      </div>
    );
  }

  const navLinks = NAV.map(({ href, label, Icon }) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium ${
          active ? 'bg-white/10 text-white' : 'text-neutral-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-gold-300" aria-hidden="true" />}
        <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-gold-300' : 'text-neutral-400 group-hover:text-neutral-200'}`} />
        {label}
      </Link>
    );
  });

  const logoutButton = (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium text-neutral-300 hover:bg-white/5 hover:text-white disabled:opacity-50"
    >
      <LogoutIcon className="h-5 w-5 shrink-0 text-neutral-400" />
      {loggingOut ? 'Saindo…' : 'Sair'}
    </button>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Menu lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-neutral-900 px-4 py-6 text-white lg:flex">
        <Wordmark className="px-3" />
        <nav className="mt-10 flex flex-1 flex-col gap-1" aria-label="Principal">
          {navLinks}
        </nav>
        <div className="border-t border-white/10 pt-3">{logoutButton}</div>
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 bg-neutral-900 text-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Wordmark />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="rounded-lg p-2 text-neutral-200 hover:bg-white/10"
          >
            {menuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-white/10 px-3 py-3" aria-label="Principal">
            {navLinks}
            <div className="mt-1 border-t border-white/10 pt-2">{logoutButton}</div>
          </nav>
        )}
      </header>

      <div>{children}</div>
    </div>
  );
}
