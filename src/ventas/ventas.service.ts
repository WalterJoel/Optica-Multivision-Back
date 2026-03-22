import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import {
  SeguimientoPedido,
  HistorialEstado,
} from './entities/seguimientoPedido.entity';
import { Stock } from '../productos/entities';
import { StockProducto } from '../productos/entities';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { TipoProducto } from 'src/common/constants';
import { CrearSeguimientoPedidoDto } from './dto/crear-seguimiento-pedido-dto';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(SeguimientoPedido)
    private readonly seguimientoRepository: Repository<SeguimientoPedido>,
  ) {}

  async crearVenta(createVentaDto: CrearVentaDto) {
    const { productos, ...ventaData } = createVentaDto;

    return await this.ventaRepository.manager.transaction(async (manager) => {
      const venta = manager.getRepository(Venta).create({
        ...ventaData,
        productos: productos.map((p) => ({ ...p })),
      });
      const ventaGuardada = await manager.getRepository(Venta).save(venta);

      for (const p of productos) {
        if (p.tipoProducto === TipoProducto.LENTE) {
          const stock = await manager.getRepository(Stock).findOne({
            where: { id: p.stockId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!stock || stock.cantidad < p.cantidad) {
            throw new Error(`Stock insuficiente para lente ${p.productoId}`);
          }
          stock.cantidad -= p.cantidad;
          await manager.getRepository(Stock).save(stock);
        } else {
          const stockProd = await manager.getRepository(StockProducto).findOne({
            where: { id: p.stockProductoId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!stockProd || stockProd.cantidad < p.cantidad) {
            throw new Error(`Stock insuficiente para producto ${p.productoId}`);
          }
          stockProd.cantidad -= p.cantidad;
          await manager.getRepository(StockProducto).save(stockProd);
        }
      }

      // ✅ Crear seguimiento de pedido
      await this.crearSeguimientoDePedido({
        ventaId: ventaGuardada.id,
      });

      return ventaGuardada;
    });
  }

  // ┌───────────────────────────────────────────────┐
  // │  📦 SECCIÓN: SEGUIMIENTO DE PEDIDOS          │
  // └───────────────────────────────────────────────┘

  private async crearSeguimientoDePedido(crearDto: CrearSeguimientoPedidoDto) {
    const seguimiento = this.seguimientoRepository.create({
      ventaId: crearDto.ventaId,
    });

    return this.seguimientoRepository.save(seguimiento);
  }

  async obtenerSeguimientosCreados() {
    return await this.seguimientoRepository.find({
      where: { estado: 'CREADO' },
      relations: ['venta'],
    });
  }
}
