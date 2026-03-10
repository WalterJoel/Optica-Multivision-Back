import { Module } from '@nestjs/common';
import { DescuentosService } from './descuentos.service';
import { DescuentosController } from './descuentos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Descuento } from './entities/descuento.entity';
import { Producto } from 'src/productos/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Descuento, Producto])],
  controllers: [DescuentosController],
  providers: [DescuentosService],
})
export class DescuentosModule {}
