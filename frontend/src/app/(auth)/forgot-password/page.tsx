'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordFormValues } from '@/lib/validations/auth.schema';
import { forgotPasswordRequest } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setMessage(null);
    try {
      await forgotPasswordRequest(values.email);
      setMessage(
        'Se o e-mail informado estiver cadastrado, você receberá o link de redefinição em instantes. Se não chegar, confira a caixa de spam.',
      );
    } catch {
      setMessage('Não foi possível enviar agora. Tente novamente em instantes.');
    }
  }

  return (
    <div className="flex w-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Esqueceu sua senha?</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Informe seu e-mail para receber o link de redefinição
          </p>
        </div>

        {message ? (
          <p className="text-sm text-neutral-700">{message}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando…' : 'Enviar link de redefinição'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-neutral-500">
          <Link href="/login" className="text-blue-600 hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
