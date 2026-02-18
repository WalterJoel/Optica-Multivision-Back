import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { join } from 'path';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

    // ✅ Servir archivos subidos (uploads)
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));


  // Habilitar CORS para todas las rutas y todos los orígenes
  app.enableCors({
    origin: 'http://localhost:3000', // tu frontend de Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // si necesitas cookies
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Server running on http://localhost:${process.env.PORT ?? 3001}`);
}

bootstrap();
