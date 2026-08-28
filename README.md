# Controle Financeiro

App de controle financeiro pessoal: receitas, despesas, categorias e relatórios.

## 1) Grupo
Projeto individual (solo).

## 2) Ideia
Aplicação de controle financeiro que permite cadastrar categorias, lançar
receitas e despesas, e visualizar relatórios (resumo e totais por categoria).

## 3) Tecnologias
- **Front-end:** React + Vite (TypeScript)
- **Back-end:** Node.js + Express (TypeScript)
- **ORM:** Prisma
- **Banco de dados:** PostgreSQL (Neon)

## Arquitetura em camadas (back-end)

```
backend/src
├── routes/         → define os endpoints HTTP
├── controllers/     → recebe req/res, chama o service, não tem regra de negócio
├── services/        → regras de negócio e validação (Zod)
├── repositories/     → única camada que fala com o Prisma/banco
├── middlewares/      → tratamento de erros, AppError
└── config/           → instância do Prisma Client
```

Fluxo: `Route → Controller → Service → Repository → Prisma → Postgres`.

## Estrutura do repositório

```
controle-financeiro/
├── backend/     (API Express + Prisma)
└── frontend/    (React + Vite)
```

## 4) Setup local

### Backend
```bash
cd backend
npm install
npm run prisma:migrate     # cria as tabelas no Neon a partir do schema.prisma
npm run dev                 # http://localhost:3333
```

O arquivo `backend/.env` já está configurado com a `DATABASE_URL` do Neon
fornecida. **Não commite esse arquivo** (já está no `.gitignore`).

### Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

## Endpoints principais

| Método | Rota                        | Descrição                    |
|--------|-----------------------------|-------------------------------|
| GET    | /api/categories              | Lista categorias              |
| POST   | /api/categories              | Cria categoria                |
| DELETE | /api/categories/:id           | Remove categoria               |
| GET    | /api/transactions             | Lista transações (filtros)     |
| POST   | /api/transactions             | Cria transação                 |
| DELETE | /api/transactions/:id          | Remove transação                |
| GET    | /api/reports/summary            | Receitas, despesas e saldo      |
| GET    | /api/reports/by-category         | Totais agrupados por categoria    |

## 5) Deploy na Vercel

O projeto tem **dois deploys separados** na Vercel (um para o back-end, outro
para o front-end), pois são apps independentes.

### Backend (API)
1. Crie um novo projeto na Vercel apontando para a pasta `backend/`
   (Root Directory = `backend`).
2. Em **Settings → Environment Variables**, adicione:
   - `DATABASE_URL` → a connection string do Neon (a mesma do `.env`, **use a
     versão com pooler** para serverless, que já é a fornecida).
   - `CORS_ORIGIN` → a URL final do front-end (ex.: `https://seu-front.vercel.app`).
3. Build Command: `npm run prisma:generate && npm run build` (já definido no
   `vercel.json`).
4. Rode as migrations do Prisma **uma vez** contra o banco de produção antes
   do primeiro deploy (pode ser da sua máquina, apontando `DATABASE_URL` para
   o Neon):
   ```bash
   npm run prisma:deploy
   ```
5. Deploy. A API ficará em algo como `https://sua-api.vercel.app/api`.

### Frontend
1. Crie outro projeto na Vercel apontando para a pasta `frontend/`
   (Root Directory = `frontend`). Framework preset: **Vite**.
2. Em **Environment Variables**, adicione:
   - `VITE_API_URL` → `https://sua-api.vercel.app/api`
3. Deploy.

### ⚠️ Segurança
A senha do banco do Neon foi compartilhada em texto durante o
desenvolvimento deste projeto. Recomenda-se **rotacionar a senha** no painel
do Neon (Settings → Reset password) e atualizar `DATABASE_URL` no `.env`
local e nas variáveis de ambiente da Vercel depois de finalizar os testes.
