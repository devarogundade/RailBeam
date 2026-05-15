import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';

/** Prefix match for CORS_ORIGINS entries (e.g. http://localhost → any port on that host). */
function originMatchesAllowedPrefix(origin: string, allowed: string): boolean {
  if (origin === allowed) return true;
  if (!origin.startsWith(allowed)) return false;
  const tail = origin.slice(allowed.length);
  return tail === '' || tail.startsWith(':') || tail.startsWith('/');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.useWebSocketAdapter(new WsAdapter(app));

  const corsOrigins = (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const corsAllowAll = corsOrigins.some((o) => o === '*');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsOrigins.length === 0 || corsAllowAll) {
        return callback(null, true);
      }
      return callback(
        null,
        corsOrigins.some((allowed) =>
          originMatchesAllowedPrefix(origin, allowed),
        ),
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposedHeaders: [
      'PAYMENT-REQUIRED',
      'PAYMENT-SIGNATURE',
      'PAYMENT-RESPONSE',
      'X-PAYMENT-RESPONSE',
    ],
    // Omit allowedHeaders so the cors middleware mirrors Access-Control-Request-Headers
    // (required for client headers like X-Beam-Chain-Id from stardormAxios).
  });

  await app.listen(process.env.PORT ?? 3401);
}
bootstrap();
