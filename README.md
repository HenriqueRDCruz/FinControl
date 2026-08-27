# Controle Financeiro

Aplicação web para controle de receitas, despesas, investimentos e categorias, com dashboard e gráficos.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- ORM: Prisma
- Banco: PostgreSQL
- Gráficos: Recharts
- Deploy: Vercel (frontend) + backend em serviço Node compatível

## Estrutura
- `frontend/`: interface React
- `backend/`: API REST e Prisma

## Executar
### Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Defina `VITE_API_URL` no frontend se a API não estiver em `http://localhost:3333/api`.
