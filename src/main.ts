import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
// import { getAwsParameter } from 'src/aws-infrastructure/ssm/ssm.config';

async function bootstrap() {
  // ✅ Obtengo los secretos desde AWS
  // process.env.DATABASE_URL = await getAwsParameter('opticabd');
  // process.env.NODE_ENV = await getAwsParameter('entorno');
  console.log(process.env.DATABASE_URL, ' BD --- CREDENCIALES');

  const app = await NestFactory.create(AppModule);

  // ✅ Servir uploads
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // ✅ CORS sin cookies
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://master.d2ygexviux9rer.amplifyapp.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    //perimitir authorisation en cors
    allowedHeaders: 'Content-Type, Authorization',

    credentials: true,
    maxAge: 86400,
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Server running on http://localhost:${process.env.PORT ?? 3001}`);
}

bootstrap();
