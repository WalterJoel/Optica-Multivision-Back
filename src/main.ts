import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ❌ Ya no necesario en token-only
  // app.use(cookieParser());

  // ✅ Servir uploads
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // ✅ CORS sin cookies
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false,
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Server running on http://localhost:${process.env.PORT ?? 3001}`);
}

bootstrap();
