import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { SeguimientoPedido } from './entities/seguimientoPedido.entity';
import { Stock } from '../productos/entities';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { TipoProducto } from 'src/common/constants';
import { CrearSeguimientoPedidoDto } from './dto/crear-seguimiento-pedido-dto';
import { CajaService } from 'src/caja/caja.service';
import { TipoMovimiento } from 'src/caja/entities/movimientoCaja.entity';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(SeguimientoPedido)
    private readonly seguimientoRepository: Repository<SeguimientoPedido>,

    private readonly cajaService: CajaService,
  ) {}

  async crearVenta(createVentaDto: CrearVentaDto) {
    // const { productos, ...ventaData } = createVentaDto;
    // return await this.ventaRepository.manager.transaction(async (manager) => {
    //   try {
    //     // =========================
    //     // 1. CREAR VENTA (PENDIENTE VALIDACIÓN)
    //     // =========================
    //     const venta = manager.getRepository(Venta).create({
    //       ...ventaData,
    //       productos: productos.map((p) => ({ ...p })),
    //     });
    //     const ventaGuardada = await manager.getRepository(Venta).save(venta);
    //     // =========================
    //     // 2. VALIDAR Y DESCONTAR STOCK
    //     // =========================
    //     for (const p of productos) {
    //       if (p.tipoProducto === TipoProducto.LENTE) {
    //         const stock = await manager.getRepository(Stock).findOne({
    //           where: { id: p.stockId },
    //           lock: { mode: 'pessimistic_write' },
    //         });
    //         if (!stock || stock.cantidad < p.cantidad) {
    //           throw new ConflictException({
    //             message: `Stock insuficiente para lente ${p.productoId}`,
    //           });
    //         }
    //         stock.cantidad -= p.cantidad;
    //         await manager.getRepository(Stock).save(stock);
    //       } else {
    //         const stockProd = await manager
    //           .getRepository(StockProducto)
    //           .findOne({
    //             where: { id: p.stockProductoId },
    //             lock: { mode: 'pessimistic_write' },
    //           });
    //         if (!stockProd || stockProd.cantidad < p.cantidad) {
    //           throw new ConflictException({
    //             message: `Stock insuficiente para producto ${p.productoId}`,
    //           });
    //         }
    //         stockProd.cantidad -= p.cantidad;
    //         await manager.getRepository(StockProducto).save(stockProd);
    //       }
    //     }
    //     // =========================
    //     // 3. SEGUIMIENTO (OPCIONAL)
    //     // =========================
    //     // await this.crearSeguimientoDePedido({
    //     //   ventaId: ventaGuardada.id,
    //     // });
    //     // =========================
    //     // 4. SE CREA INGRESO A CAJA
    //     await this.cajaService.registrarMovimientoTransaction(manager, {
    //       sedeId: ventaData.sedeId,
    //       tipo: TipoMovimiento.INGRESO,
    //       monto: Number(ventaGuardada.total),
    //       descripcion: `Ingreso por venta #${ventaGuardada.id}`,
    //       ventaId: ventaGuardada.id,
    //       metodoPago: ventaData.metodoPago,
    //     });
    //     return {
    //       message: 'Venta creada correctamente',
    //       data: ventaGuardada,
    //     };
    //   } catch (error) {
    //     console.log(error);
    //     throw new ConflictException({
    //       message: error?.message || 'Error al crear venta',
    //     });
    //   }
    // });
  }

  async obtenerVentas() {
    return await this.ventaRepository.find({
      relations: {
        productos: true,
      },
      order: {
        createdAt: 'DESC',
      },
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
