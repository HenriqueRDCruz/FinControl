import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Investments (e2e) — CRUD, resumo e isolamento entre usuarios', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessTokenA: string;
  let accessTokenB: string;

  const userA = { name: 'Usuaria A', email: 'investments.a@teste.com', password: 'SenhaForte123' };
  const userB = { name: 'Usuario B', email: 'investments.b@teste.com', password: 'SenhaForte456' };

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

  it('cria um investimento', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ type: 'STOCK', name: 'PETR4', investedAmount: 1000, currentValue: 1150 })
      .expect(201);

    expect(res.body.name).toBe('PETR4');
    expect(res.body.currentValue).toBe(1150);
  });

  it('o resumo reflete lucro e distribuicao por tipo apenas dos investimentos do usuario', async () => {
    await request(app.getHttpServer())
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ type: 'FIXED_INCOME', name: 'Tesouro Selic', investedAmount: 2000, currentValue: 2050 })
      .expect(201);

    const summary = await request(app.getHttpServer())
      .get('/api/investments/summary')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(200);

    expect(summary.body.totalInvested).toBeGreaterThanOrEqual(3000);
    expect(summary.body.allocation.length).toBeGreaterThanOrEqual(2);
  });

  it('usuario B NAO consegue ler, alterar ou excluir investimento de usuario A', async () => {
    const investmentA = await request(app.getHttpServer())
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ type: 'CRYPTO', name: 'Bitcoin', investedAmount: 500, currentValue: 480 })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/investments/${investmentA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/investments/${investmentA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .send({ currentValue: 999999 })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/investments/${investmentA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(404);
  });

  it("o resumo de B nunca inclui a carteira de A", async () => {
    const res = await request(app.getHttpServer())
      .get('/api/investments/summary')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(200);

    expect(res.body.totalInvested).toBe(0);
  });

  it('rejeita valor investido zero ou negativo', async () => {
    await request(app.getHttpServer())
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ type: 'STOCK', name: 'Invalido', investedAmount: 0, currentValue: 0 })
      .expect(400);
  });
});
