import { Module } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENTITIES } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature(ENTITIES)],
  controllers: [ProductosController],
  providers: [ProductosService],
})
export class ProductosModule {}
