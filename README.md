## Como rodar localmente

```bash
# Backend
cd backend && cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run start:dev
npm test
npm run test:e2e

# Frontend (outro terminal)
cd frontend && cp .env.example .env.local
npm install
npm run build
npm start
```

# Criar conta: http://localhost:3001/
