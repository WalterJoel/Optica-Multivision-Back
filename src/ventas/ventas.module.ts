import { Module } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from './entities/venta.entity';
import { VentaProducto } from './entities/ventaProducto.entity';
import { VentaKit } from './entities/ventaKit.entity';
import { SeguimientoPedido } from './entities/seguimientoPedido.entity';
import { Stock } from 'src/productos/entities';
import { CajaService } from 'src/caja/caja.service';
import { CajaModule } from 'src/caja/caja.module';
import { KardexModule } from 'src/kardex/kardex.module';
import { KitsModule } from 'src/kits/kits.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, VentaProducto, VentaKit, Stock, SeguimientoPedido]),
    CajaModule,
    KardexModule,
    KitsModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
