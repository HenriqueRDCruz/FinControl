import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('NetWorth (e2e) — calculo automatico e isolamento entre usuarios', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessTokenA: string;
  let accessTokenB: string;

  const userA = { name: 'Usuaria A', email: 'networth.a@teste.com', password: 'SenhaForte123' };
  const userB = { name: 'Usuario B', email: 'networth.b@teste.com', password: 'SenhaForte456' };

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

  it('usuario sem lancamentos ainda tem patrimonio zero', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/net-worth/current')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(200);

    expect(res.body.netWorth).toBe(0);
  });

  it('patrimonio reflete renda - gastos + investimentos, so do proprio usuario', async () => {
    await request(app.getHttpServer())
      .post('/api/incomes')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Salario', amount: 8000, date: '2026-08-01' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Aluguel', amount: 2000, date: '2026-08-05' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ type: 'FIXED_INCOME', name: 'CDB', investedAmount: 1000, currentValue: 1050 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/net-worth/current')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(200);

    expect(res.body.totalIncome).toBe(8000);
    expect(res.body.totalExpenses).toBe(2000);
    expect(res.body.totalInvestments).toBe(1050);
    expect(res.body.netWorth).toBe(7050);

    const resB = await request(app.getHttpServer())
      .get('/api/net-worth/current')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(200);
    expect(resB.body.netWorth).toBe(0);
  });

  it('consultar o patrimonio atual grava um ponto no historico automaticamente', async () => {
    await request(app.getHttpServer())
      .get('/api/net-worth/current')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(200);

    const history = await request(app.getHttpServer())
      .get('/api/net-worth/history')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(200);

    expect(history.body.length).toBeGreaterThanOrEqual(1);
    expect(history.body[history.body.length - 1].netWorth).toBe(7050);
  });

  it('sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/api/net-worth/current').expect(401);
  });
});
