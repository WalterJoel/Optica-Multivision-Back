import { Module } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from './entities/venta.entity';
import { VentaProducto } from './entities/ventaProducto.entity';
import { SeguimientoPedido } from './entities/seguimientoPedido.entity';
import { Stock, StockProducto } from 'src/productos/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      VentaProducto,
      Stock,
      StockProducto,
      SeguimientoPedido,
    ]),
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
