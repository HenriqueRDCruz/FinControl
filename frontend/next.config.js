/** @type {import('next').NextConfig} */

// URL do backend (NestJS). Usada no servidor do Next para repassar /api/*.
// Em producao, defina BACKEND_URL no painel do host ANTES do build
// (ex.: https://fincontrol-9.onrender.com). Sem barra no final e sem /api.
// Tolera barra no final e um "/api" colado por engano (o /api é acrescentado abaixo).
const BACKEND_URL = (
  process.env.BACKEND_URL ?? "https://fincontrol-14.onrender.com"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const nextConfig = {
  reactStrictMode: true,
  // No plano gratuito do Render o backend "dorme" e leva cerca de 1 minuto para acordar. O repasse do Next
  // desiste em 30 s por padrao (e responde "Internal Server Error"); com 2 min a primeira requisicao espera.
  experimental: {
    proxyTimeout: 120_000,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
