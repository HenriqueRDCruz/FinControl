import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

// As datas de lançamentos são colunas DATE (dia do calendário, meia-noite UTC). Fixar o fuso do processo em UTC
// faz o cálculo de mês e de fechamento de fatura dar o mesmo resultado na máquina local (UTC-3) e no servidor.
process.env.TZ = 'UTC';

const SLOW_REQUEST_MS = 400;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  // Avisa no log quando uma requisição demora, para saber exatamente qual endpoint está lento.
  const httpLogger = new Logger('HTTP');
  app.use((req: { method: string; originalUrl: string }, res: { statusCode: number; on: (e: string, cb: () => void) => void }, next: () => void) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      if (ms >= SLOW_REQUEST_MS) {
        httpLogger.warn(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
      }
    });
    next();
  });

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`API rodando em http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap();
