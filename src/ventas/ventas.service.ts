import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { VentaProducto } from './entities/ventaProducto.entity';
import { SeguimientoPedido } from './entities/seguimientoPedido.entity';
import { Producto, Stock } from '../productos/entities';
import { CrearVentaDto, VentaProductoDto } from './dto/crear-venta.dto';
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
  ) { }

  async crearVenta(createVentaDto: CrearVentaDto) {
    const { productos, ...ventaData } = createVentaDto;

    return await this.ventaRepository.manager.transaction(async (manager) => {
      try {
        // 1. Validar y descontar stock antes de crear la venta (Fail-Fast)
        await this.descontarStock(manager, productos);

        // 2. Crear y guardar la venta con sus productos en cascada (Instanciación Explícita Tipo-Segura)
        const venta = manager.getRepository(Venta).create(ventaData);

        venta.productos = productos.map((p) => {
          return manager.getRepository(VentaProducto).create({
            ...p,
            productoId: p.tipoProducto === TipoProducto.LENTE ? null : p.productoId,
            stockId: p.tipoProducto === TipoProducto.LENTE ? p.stockId : null,
            esf: p.tipoProducto === TipoProducto.LENTE ? p.esf : null,
            cyl: p.tipoProducto === TipoProducto.LENTE ? p.cyl : null,
          });
        });

        const ventaGuardada = await manager.getRepository(Venta).save(venta);

        // 3. Registrar el ingreso correspondiente en la caja activa
        await this.cajaService.registrarMovimientoTransaction(manager, {
          sedeId: ventaData.sedeId,
          tipo: TipoMovimiento.INGRESO,
          monto: Number(ventaGuardada.total),
          descripcion: `Ingreso por venta #${ventaGuardada.id}`,
          ventaId: ventaGuardada.id,
          metodoPago: ventaData.metodoPago,
        });

        return {
          message: 'Venta creada correctamente',
          data: ventaGuardada,
        };
      } catch (error) {
        console.error(error);
        throw new ConflictException({
          message: error?.message || 'Error al crear venta',
        });
      }
    });
  }

  /**
   * Valida y descuenta el stock de lentes, monturas o accesorios de manera segura.
   * Emplea un bloqueo de escritura pesimista (SELECT FOR UPDATE) para evitar condiciones de carrera.
   */
  private async descontarStock(manager: EntityManager, productos: VentaProductoDto[]) {
    for (const p of productos) {
      if (p.tipoProducto === TipoProducto.LENTE) {
        // Bloqueo y descuento de Lentes en la grilla de stock
        const stock = await manager.getRepository(Stock).findOne({
          where: { id: p.stockId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!stock || stock.cantidad < p.cantidad) {
          throw new ConflictException({
            message: `Stock insuficiente para el lente solicitado.`,
          });
        }

        stock.cantidad -= p.cantidad;
        await manager.getRepository(Stock).save(stock);
      } else {
        // Bloqueo y descuento de Monturas y Accesorios en la tabla de productos general
        const producto = await manager.getRepository(Producto).findOne({
          where: { id: p.productoId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!producto || producto.cantidad < p.cantidad) {
          throw new ConflictException({
            message: `Stock insuficiente para el producto: ${producto?.nombre || p.productoId}`,
          });
        }

        producto.cantidad -= p.cantidad;
        await manager.getRepository(Producto).save(producto);
      }
    }
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
