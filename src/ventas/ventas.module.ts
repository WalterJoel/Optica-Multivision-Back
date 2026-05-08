import { Module } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from './entities/venta.entity';
import { VentaProducto } from './entities/ventaProducto.entity';
import { SeguimientoPedido } from './entities/seguimientoPedido.entity';
import { Stock, StockProducto } from 'src/productos/entities';
import { CajaService } from 'src/caja/caja.service';
import { CajaModule } from 'src/caja/caja.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      VentaProducto,
      Stock,
      StockProducto,
      SeguimientoPedido,
    ]),
    CajaModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
