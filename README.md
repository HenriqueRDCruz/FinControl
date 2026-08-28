# FinControl — Controle Financeiro

MVP acadêmico com React + Vite + TypeScript no frontend, API serverless TypeScript/Node no backend, Prisma e PostgreSQL.

## 1. Banco
Crie um PostgreSQL (ex.: Neon/Supabase) e obtenha `DATABASE_URL`.

## 2. Variável local
Na raiz crie `.env` a partir de `.env.example`.

## 3. Instalação
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Para desenvolvimento da API serverless, a forma mais fácil é usar `vercel dev` após instalar a Vercel CLI. Para o deploy, a Vercel usa `npm run build` e publica `frontend/dist`.

## Deploy
1. Suba o repositório para GitHub.
2. Importe o repositório na Vercel.
3. Não defina Root Directory; o `vercel.json` da raiz já aponta para `frontend`.
4. Em Environment Variables, adicione `DATABASE_URL` do PostgreSQL.
5. Faça o deploy.
6. Depois, aplique a migration no banco de produção com `npx prisma migrate deploy`.
