## Como rodar localmente

**Com Docker (recomendado):**

```bash
docker compose up --build
# API:      http://localhost:3001/api/health
# Frontend: http://localhost:3000
```

Na primeira vez, crie as tabelas no banco:

```bash
docker compose exec backend npx prisma migrate dev --name init
```

**Sem Docker:**

```bash
# Backend
cd backend && cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run start:dev
npm test                # testes unitários
npm run test:e2e        # requer Postgres de teste configurado

# Frontend (outro terminal)
cd frontend && cp .env.example .env.local
npm install
npm run dev
```

# Criar conta: http://localhost:3001/register
