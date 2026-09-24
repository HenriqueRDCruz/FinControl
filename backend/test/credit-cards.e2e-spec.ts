import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CreditCards (e2e) — CRUD, fatura e isolamento entre usuarios', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessTokenA: string;
  let accessTokenB: string;

  const userA = { name: 'Usuaria A', email: 'cards.a@teste.com', password: 'SenhaForte123' };
  const userB = { name: 'Usuario B', email: 'cards.b@teste.com', password: 'SenhaForte456' };

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

  it('cria um cartao', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/credit-cards')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ name: 'Nubank', limitAmount: 5000, closingDay: 10, dueDay: 17 })
      .expect(201);

    expect(res.body.name).toBe('Nubank');
    expect(res.body.limitAmount).toBe(5000);
  });

  it('gasto vinculado ao cartao aparece na fatura correta e reduz o limite disponivel', async () => {
    const card = await request(app.getHttpServer())
      .post('/api/credit-cards')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ name: 'Itau', limitAmount: 3000, closingDay: 5, dueDay: 12 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({
        description: 'Passagem aerea',
        amount: 900,
        paymentMethod: 'CREDIT_CARD',
        installmentCount: 3,
        creditCardId: card.body.id,
        date: '2026-08-10',
      })
      .expect(201);

    const limit = await request(app.getHttpServer())
      .get(`/api/credit-cards/${card.body.id}/limit`)
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(200);

    expect(limit.body.used).toBe(900);
    expect(limit.body.available).toBe(2100);

    const upcoming = await request(app.getHttpServer())
      .get(`/api/credit-cards/${card.body.id}/upcoming-invoices`)
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(200);

    expect(upcoming.body).toHaveLength(3);
    const sumAcrossInvoices = upcoming.body.reduce(
      (acc: number, inv: { total: number }) => acc + inv.total,
      0,
    );
    expect(Math.round(sumAcrossInvoices * 100) / 100).toBe(900);
  });

  it('rejeita gasto vinculado a cartao de outro usuario', async () => {
    const cardA = await request(app.getHttpServer())
      .post('/api/credit-cards')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ name: 'Cartao de A', limitAmount: 1000, closingDay: 15, dueDay: 22 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .send({
        description: 'Tentativa maliciosa',
        amount: 100,
        paymentMethod: 'CREDIT_CARD',
        creditCardId: cardA.body.id,
        date: '2026-08-10',
      })
      .expect(404);
  });

  it('usuario B NAO consegue ler, alterar ou "excluir" cartao de usuario A', async () => {
    const cardA = await request(app.getHttpServer())
      .post('/api/credit-cards')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ name: 'Outro cartao de A', limitAmount: 2000, closingDay: 20, dueDay: 27 })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/credit-cards/${cardA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/credit-cards/${cardA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .send({ name: 'Renomeado por invasor' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/credit-cards/${cardA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(404);
  });

  it('a listagem de B nunca inclui cartoes de A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/credit-cards')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(200);

    const names = res.body.map((c: { name: string }) => c.name);
    expect(names).not.toContain('Nubank');
    expect(names).not.toContain('Itau');
  });
});
