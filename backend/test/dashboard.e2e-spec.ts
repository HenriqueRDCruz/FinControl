import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Dashboard (e2e) — visao consolidada e isolamento entre usuarios', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessTokenA: string;
  let accessTokenB: string;

  const userA = { name: 'Usuaria A', email: 'dashboard.a@teste.com', password: 'SenhaForte123' };
  const userB = { name: 'Usuario B', email: 'dashboard.b@teste.com', password: 'SenhaForte456' };

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

  it('usuario sem lancamentos recebe overview zerado, sem quebrar', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(200);

    expect(res.body.netWorth.netWorth).toBe(0);
    expect(res.body.currentMonth.savingsRate).toBe(0);
    expect(res.body.trend).toHaveLength(6);
    expect(res.body.expensesByCategory).toEqual([]);
  });

  it('overview de A reflete os lancamentos de A e nunca os de B', async () => {
    const today = new Date().toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .post('/api/incomes')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Salario', amount: 6000, date: today })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Mercado', amount: 900, category: 'FOOD', date: today })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Aluguel', amount: 1500, category: 'HOUSING', date: today })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(200);

    expect(res.body.currentMonth.income).toBeGreaterThanOrEqual(6000);
    expect(res.body.currentMonth.expenses).toBeGreaterThanOrEqual(2400);
    expect(res.body.expensesByCategory.map((c: { category: string }) => c.category)).toEqual(
      expect.arrayContaining(['HOUSING', 'FOOD']),
    );
    expect(res.body.expensesByCategory[0].category).toBe('HOUSING');

    const resB = await request(app.getHttpServer())
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(200);
    expect(resB.body.currentMonth.income).toBe(0);
    expect(resB.body.expensesByCategory).toEqual([]);
  });

  it('sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/api/dashboard/overview').expect(401);
  });
});
