import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(json());
  app.enableCors({ origin: '*' });
  await app.listen(process.env.PORT ?? 3402);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

