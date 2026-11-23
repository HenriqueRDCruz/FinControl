'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ensureSession } from '@/lib/api/client';
import { Guilloche } from '@/components/Guilloche';
import { Wordmark } from '@/components/Wordmark';

// Quem ja esta logado não precisa ver estas telas: vai direto para a home.
// As demais (verificar e-mail, redefinir senha) continuam acessiveis por link.
const REDIRECT_IF_LOGGED_IN = ['/login', '/register', '/forgot-password'];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const shouldCheck = REDIRECT_IF_LOGGED_IN.includes(pathname);
  const [checking, setChecking] = useState(shouldCheck);

  useEffect(() => {
    if (!shouldCheck) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    ensureSession().then((ok) => {
      if (cancelled) return;
      if (ok) router.replace('/');
      else setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldCheck, router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca */}
      <aside className="relative overflow-hidden bg-indigo-800 text-white">
        <Guilloche
          id="g-auth"
          className="pointer-events-none absolute -bottom-52 -right-52 hidden h-[46rem] w-[46rem] text-indigo-200 lg:block"
          opacity={0.5}
        />
        <div className="relative flex h-full flex-col gap-16 px-6 py-6 sm:px-10 lg:px-14 lg:py-12">
          <Wordmark />
          <div className="hidden max-w-md lg:block">
            <h2 className="font-display text-5xl font-semibold leading-[1.08] tracking-tight text-balance">
              Saiba para onde vai cada real.
            </h2>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-indigo-100">
              Registre o que entra e o que sai, acompanhe cartões e investimentos e veja seu patrimônio crescer.
            </p>
          </div>
        </div>
      </aside>

      {/* Formulário */}
      <main className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center bg-neutral-50 lg:min-h-screen">
        {children}
      </main>
    </div>
  );
}
