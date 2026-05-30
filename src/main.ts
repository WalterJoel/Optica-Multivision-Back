import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { getAwsParameter } from 'src/aws-infrastructure/ssm/ssm.config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // 1. Verificamos si estamos en producción (EC2) para cargar de AWS uno por uno
  if (process.env.NODE_ENV === 'production') {
    try {
      console.log('Cargando parámetros desde AWS SSM ');

      process.env.DATABASE_URL = await getAwsParameter('opticabd');
      process.env.NODE_ENV = await getAwsParameter('entorno');
      process.env.FOTOS_S3_BUCKET = await getAwsParameter('FOTOS_S3_BUCKET');
      process.env.AWS_REGION = await getAwsParameter('AWS_REGION');

      console.log('✅ Todos los parámetros de AWS cargados con éxito.');
    } catch (error) {
      console.error('❌ Error cargando parámetros desde SSM:', error);
      process.exit(1);
    }
  } else {
    console.log('Entorno Local detectado. Usando variables de entorno locales.');
  }

  const app = await NestFactory.create(AppModule);

  // ✅ Validaciones globales para DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve propiedades que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transform: true, // Convierte los tipos automáticamente (ej. string a number)
    }),
  );

  // ✅ Servir uploads locales (útil para tu desarrollo en local)
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // ✅ Configuración de CORS
  app.enableCors({
    origin: [
      'http://localhost:3000', // Tu React local
      'https://master.d2ygexviux9rer.amplifyapp.com', // Tu React en Amplify
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
    maxAge: 86400,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}

bootstrap();