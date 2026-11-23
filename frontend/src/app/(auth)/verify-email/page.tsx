'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmailRequest } from '@/lib/api/auth';

type Status = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    verifyEmailRequest(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="flex w-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-3 text-center">
        {status === 'loading' && <p className="text-sm text-neutral-500">Verificando seu e-mail…</p>}
        {status === 'success' && (
          <>
            <h1 className="text-xl font-semibold">E-mail verificado!</h1>
            <p className="text-sm text-neutral-500">Sua conta está confirmada. Você já pode entrar.</p>
            <Link href="/login" className="inline-block text-sm text-blue-600 hover:underline">
              Ir para o login
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
            <p className="text-sm text-neutral-500">
              Não foi possível verificar seu e-mail com este link.
            </p>
            <Link href="/login" className="inline-block text-sm text-blue-600 hover:underline">
              Voltar para o login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

// useSearchParams exige um <Suspense> no build de producao (a pagina e pre-renderizada sem a URL).
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Carregando…</p>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
