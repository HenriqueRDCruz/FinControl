import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Expenses (e2e) — CRUD, parcelamento e isolamento entre usuarios', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessTokenA: string;
  let accessTokenB: string;

  const userA = { name: 'Usuaria A', email: 'expenses.a@teste.com', password: 'SenhaForte123' };
  const userB = { name: 'Usuario B', email: 'expenses.b@teste.com', password: 'SenhaForte456' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);

    await request(app.getHttpServer()).post('/api/auth/register').send(userA);
    await request(app.getHttpServer()).post('/api/auth/register').send(userB);
    await prisma.user.updateMany({
      where: { email: { in: [userA.email, userB.email] } },
      data: { emailVerified: true },
    });

    accessTokenA = (
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: userA.email, password: userA.password })
    ).body.accessToken;

    accessTokenB = (
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: userB.email, password: userB.password })
    ).body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [userA.email, userB.email] } } });
    await app.close();
  });

  it('cria um gasto simples em dinheiro', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Mercado', amount: 250, category: 'FOOD', date: '2026-08-10' })
      .expect(201);

    expect(res.body.amount).toBe(250);
  });

  it('compra parcelada no cartao gera N gastos cuja soma bate com o total', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({
        description: 'Notebook',
        amount: 3000,
        paymentMethod: 'CREDIT_CARD',
        installmentCount: 3,
        date: '2026-08-10',
      })
      .expect(201);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    const sum = res.body.reduce((acc: number, r: { amount: number }) => acc + r.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(3000);
  });

  it('usuario B NAO consegue ler, alterar ou excluir gasto criado por usuario A', async () => {
    const expenseA = await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Farmacia', amount: 90, date: '2026-08-12' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/expenses/${expenseA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/expenses/${expenseA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .send({ description: 'Alterado por invasor' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/expenses/${expenseA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(404);
  });

  it('a listagem de B nunca inclui gastos de A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/expenses')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(200);

    const descriptions = res.body.items.map((i: { description: string }) => i.description);
    expect(descriptions).not.toContain('Mercado');
    expect(descriptions).not.toContain('Notebook');
  });

  it('rejeita valor zero ou negativo', async () => {
    await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Invalido', amount: 0, date: '2026-08-10' })
      .expect(400);
  });
});
