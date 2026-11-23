/** @type {import('next').NextConfig} */

// URL do backend (NestJS). Usada no servidor do Next para repassar /api/*.
// Em producao, defina BACKEND_URL no painel do host ANTES do build
// (ex.: https://fincontrol-9.onrender.com). Sem barra no final e sem /api.
const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
