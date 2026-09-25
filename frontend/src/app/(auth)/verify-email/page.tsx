"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmailRequest } from "@/lib/api/auth";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    verifyEmailRequest(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-3 text-center">
        {status === "loading" && (
          <p className="text-sm text-neutral-500">Verificando seu e-mail…</p>
        )}

        {status === "success" && (
          <>
            <h1 className="text-xl font-semibold">E-mail verificado!</h1>

            <p className="text-sm text-neutral-500">
              Sua conta esta confirmada. Voce ja pode entrar.
            </p>

            <Link
              href="/login"
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              Ir para o login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold">Link invalido ou expirado</h1>

            <p className="text-sm text-neutral-500">
              Nao foi possivel verificar seu e-mail com este link.
            </p>

            <Link
              href="/login"
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              Voltar para o login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
