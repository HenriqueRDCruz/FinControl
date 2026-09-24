import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Incomes (e2e) — CRUD e isolamento entre usuarios', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessTokenA: string;
  let accessTokenB: string;

  const userA = { name: 'Usuaria A', email: 'incomes.a@teste.com', password: 'SenhaForte123' };
  const userB = { name: 'Usuario B', email: 'incomes.b@teste.com', password: 'SenhaForte456' };

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

  it('cria uma renda para o usuario A', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/incomes')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Salario', amount: 5000, date: '2026-08-01' })
      .expect(201);

    expect(res.body.amount).toBe(5000);
  });

  it('usuario B NAO consegue ler, alterar ou excluir renda criada por usuario A', async () => {
    const incomeA = await request(app.getHttpServer())
      .post('/api/incomes')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Freela', amount: 1200, date: '2026-08-05' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/incomes/${incomeA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/incomes/${incomeA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .send({ description: 'Alterado por invasor' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/incomes/${incomeA.body.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(404);
  });

  it('a listagem de B nunca inclui rendas de A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/incomes')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(200);

    const descriptions = res.body.items.map((i: { description: string }) => i.description);
    expect(descriptions).not.toContain('Salario');
    expect(descriptions).not.toContain('Freela');
  });

  it('rejeita valor negativo ou zero', async () => {
    await request(app.getHttpServer())
      .post('/api/incomes')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ description: 'Invalida', amount: -10, date: '2026-08-01' })
      .expect(400);
  });
});
