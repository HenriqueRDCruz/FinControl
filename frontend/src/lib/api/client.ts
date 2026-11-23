// Por padrao a API e acessada pelo proprio dominio do frontend (/api), que o Next
// repassa ao backend (ver next.config.js). Assim o cookie de refresh e "do mesmo site".
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

let onSessionExpired: (() => void) | null = null;

/** Registra o que fazer quando a sessao expira de vez (ex.: redirecionar para /login). */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        setAccessToken(data.accessToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Garante que existe uma sessao valida. Se o access token (que fica so em memoria)
 * foi perdido, ex.: ao recarregar a pagina, tenta recupera-lo pelo refresh token do cookie.
 */
export async function ensureSession(): Promise<boolean> {
  if (accessToken) return true;
  return tryRefresh();
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipRefreshRetry?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuth, skipRefreshRetry, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (!skipAuth && accessToken) {
    finalHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: 'include',
  });

  if (res.status === 401 && !skipAuth && !skipRefreshRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipRefreshRetry: true });
    }
    setAccessToken(null);
    onSessionExpired?.();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? 'Erro na requisicao', body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
