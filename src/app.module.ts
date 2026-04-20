import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ProductosModule } from './productos/products.module';
import { SedesModule } from './sedes/sedes.module';
import { ChatModule } from './chat/chat.module';
import { ClientesModule } from './clientes/clientes.module';
import { KitsModule } from './kits/kits.module';
import { DescuentosModule } from './descuentos/descuentos.module';
import { VentasModule } from './ventas/ventas.module';
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // Usamos useFactory para que la configuración se genere dinámicamente
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        // url: 'postgresql://postgres:ogFHyFOjkozggEkOdatCWwdqxSLppEik@hopper.proxy.rlwy.net:15380/railway',
        autoLoadEntities: true,
        // Evita synchronize: true en producción por seguridad de datos
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
