import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ProductosModule } from './productos/products.module';
import { SedesModule } from './sedes/sedes.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgresql://postgres:QHUEEXSIaFtEyeeVsZRkyHTNzSrDTMml@trolley.proxy.rlwy.net:45962/railway',
      autoLoadEntities: true,
      synchronize: true, // SOLO DEV
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    }),
    AuthModule,
    UsersModule,
    ProductosModule,
    SedesModule,
      ChatModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
