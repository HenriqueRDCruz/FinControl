import { apiFetch, setAccessToken } from './client';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

interface LoginResponse {
  user: PublicUser;
  accessToken: string;
}

export async function registerRequest(input: { name: string; email: string; password: string }) {
  return apiFetch<{ user: PublicUser }>('/auth/register', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(input),
  });
}

export async function loginRequest(input: { email: string; password: string }) {
  const data = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(input),
  });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function logoutRequest() {
  await apiFetch('/auth/logout', { method: 'POST' });
  setAccessToken(null);
}

export async function forgotPasswordRequest(email: string) {
  return apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordRequest(token: string, newPassword: string) {
  return apiFetch<{ success: boolean }>('/auth/reset-password', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function verifyEmailRequest(token: string) {
  return apiFetch<{ success: boolean }>('/auth/verify-email', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ token }),
  });
}
