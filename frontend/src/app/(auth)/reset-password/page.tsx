"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  ResetPasswordFormValues,
} from "@/lib/validations/auth.schema";
import { resetPasswordRequest } from "@/lib/api/auth";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) return;

    setServerError(null);

    try {
      await resetPasswordRequest(token, values.newPassword);
      router.push("/login?reset=success");
    } catch {
      setServerError(
        "Nao foi possivel redefinir sua senha. O link pode ter expirado — solicite um novo.",
      );
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
        <div className="w-full max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-semibold">Link invalido</h1>

          <p className="text-sm text-neutral-500">
            Este link de redefinicao esta incompleto ou invalido.
          </p>

          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Redefinir senha</h1>

          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Escolha uma nova senha para sua conta
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium">
              Nova senha
            </label>

            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              {...register("newPassword")}
            />

            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium"
            >
              Confirmar nova senha
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              {...register("confirmPassword")}
            />

            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-red-600">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isSubmitting ? "Salvando…" : "Redefinir senha"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
