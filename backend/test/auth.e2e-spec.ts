import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userA = { name: 'Usuaria A', email: 'usuaria.a@teste.com', password: 'SenhaForte123' };
  const userB = { name: 'Usuario B', email: 'usuario.b@teste.com', password: 'SenhaForte456' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [userA.email, userB.email] } } });
    await app.close();
  });

  it('registra dois usuarios e verifica e-mail manualmente', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send(userA).expect(201);
    await request(app.getHttpServer()).post('/api/auth/register').send(userB).expect(201);

    await prisma.user.updateMany({
      where: { email: { in: [userA.email, userB.email] } },
      data: { emailVerified: true },
    });
  });

  it('login com credenciais erradas retorna 401 com mensagem generica', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userA.email, password: 'senhaErrada' })
      .expect(401);

    expect(res.body.message).toBe('E-mail ou senha invalidos');
  });

  it('login valido retorna access token no body e refresh token em cookie httpOnly', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userA.email, password: userA.password })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/refresh_token=.*HttpOnly/);
  });

  it('rota protegida sem token retorna 401', async () => {
    await request(app.getHttpServer()).post('/api/auth/logout-all').expect(401);
  });

  it('refresh com o cookie de A renova a sessao de A corretamente', async () => {
    const loginA = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userA.email, password: userA.password });

    const refreshA = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', loginA.headers['set-cookie'])
      .expect(200);

    expect(refreshA.body.accessToken).toBeDefined();
  });

  // O teste de isolamento entre usuarios por modulo de negocio vive no
  // arquivo e2e de cada modulo — ver test/incomes.e2e-spec.ts.
});
