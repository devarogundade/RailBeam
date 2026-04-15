import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { json, raw, urlencoded } from 'express';
import { AppModule } from './app.module';
import { ethers } from 'ethers';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const http = app.getHttpAdapter().getInstance();
  http.use('/issuing/webhook', raw({ type: 'application/json' }));
  http.use(json());
  http.use(urlencoded({ extended: true }));
  app.use(cookieParser());

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsOrigins.length === 0) return callback(null, true);
      return callback(null, corsOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
