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
  app.enableCors({
    origin: '*',
  });

  const cors = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (cors?.length) {
    app.enableCors({ origin: cors, credentials: true });
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
