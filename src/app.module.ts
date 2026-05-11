import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';

import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

import { UsersModule } from './users/users.module';
import { ProductosModule } from './productos/products.module';
import { SedesModule } from './sedes/sedes.module';
import { ChatModule } from './chat/chat.module';
import { ClientesModule } from './clientes/clientes.module';
import { KitsModule } from './kits/kits.module';
import { DescuentosModule } from './descuentos/descuentos.module';
import { VentasModule } from './ventas/ventas.module';
import { CajaModule } from './caja/caja.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => ({
        type: 'postgres',

        url:
          process.env.NODE_ENV === 'production'
            ? process.env.DATABASE_URL
            : 'postgresql://postgres:adfvpTyMlpGhlmefxuUrMiDSgPEmwzLs@trolley.proxy.rlwy.net:33258/railway',

        autoLoadEntities: true,

        synchronize: process.env.NODE_ENV !== 'production',

        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    AuthModule,
    UsersModule,
    ProductosModule,
    SedesModule,
    ChatModule,
    ClientesModule,
    KitsModule,
    DescuentosModule,
    VentasModule,
    CajaModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
