import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { VentaProducto } from './entities/ventaProducto.entity';
import { SeguimientoPedido } from './entities/seguimientoPedido.entity';
import { Producto, Stock } from '../productos/entities';
import { CrearVentaDto, VentaProductoDto } from './dto/crear-venta.dto';
import { MetodoPago, TipoProducto } from 'src/common/constants';
import { CrearSeguimientoPedidoDto } from './dto/crear-seguimiento-pedido-dto';
import { CajaService } from 'src/caja/caja.service';
import { MovimientoCaja, TipoMovimiento } from 'src/caja/entities/movimientoCaja.entity';

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

        // 3. Registrar el ingreso correspondiente en la caja activa (solo si se realizó un pago en efectivo/yape/tarjeta/etc.)
        if (Number(ventaGuardada.montoPagado) > 0) {
          await this.cajaService.registrarMovimientoTransaction(manager, {
            sedeId: ventaData.sedeId,
            tipo: TipoMovimiento.INGRESO,
            monto: Number(ventaGuardada.montoPagado),
            descripcion: `Ingreso por venta #${ventaGuardada.id}`,
            ventaId: ventaGuardada.id,
            metodoPago: ventaData.metodoPago,
          });
        }

        // 4. Si la venta requiere montaje, crear automáticamente el seguimiento del pedido (Modularizado)
        await this.registrarSeguimientoSiCorresponde(manager, ventaGuardada);

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



  async obtenerSeguimientosCreados() {
    return await this.seguimientoRepository.find({
      where: { estado: 'CREADO' },
      relations: ['venta'],
    });
  }

  /**
   * Anula una venta de forma completamente transaccional, segura y auditable.
   * - Revierte el stock descontado de lentes, monturas y accesorios con bloqueo pesimista.
   * - Registra el correspondiente egreso en la caja si hubo algún cobro inicial.
   * - Actualiza el seguimiento de pedido a ANULADO.
   * - Marca la venta como inactiva (activo: false).
   */
  async anularVenta(ventaId: number) {
    return await this.ventaRepository.manager.transaction(async (manager) => {
      try {
        // 1. Buscar la venta con sus productos
        const venta = await manager.getRepository(Venta).findOne({
          where: { id: ventaId },
          relations: ['productos'],
        });

        if (!venta) {
          throw new ConflictException('Venta no encontrada.');
        }

        if (!venta.activo) {
          throw new ConflictException('La venta ya se encuentra anulada.');
        }

        // 2. Revertir el stock de forma segura para cada detalle de la venta
        for (const p of venta.productos) {
          if (p.tipoProducto === TipoProducto.LENTE) {
            if (p.stockId) {
              const stock = await manager.getRepository(Stock).findOne({
                where: { id: p.stockId },
                lock: { mode: 'pessimistic_write' },
              });
              if (stock) {
                stock.cantidad += p.cantidad;
                await manager.getRepository(Stock).save(stock);
              }
            }
          } else {
            if (p.productoId) {
              const producto = await manager.getRepository(Producto).findOne({
                where: { id: p.productoId },
                lock: { mode: 'pessimistic_write' },
              });
              if (producto) {
                producto.cantidad += p.cantidad;
                await manager.getRepository(Producto).save(producto);
              }
            }
          }
        }

        // 3. Registrar contra-movimiento (EGRESO) en la caja para la devolución
        if (Number(venta.montoPagado) > 0) {
          // Buscamos el movimiento original para obtener el método de pago correcto
          const movimientoOriginal = await manager.getRepository(MovimientoCaja).findOne({
            where: { ventaId: venta.id, tipo: TipoMovimiento.INGRESO },
          });

          const metodoPagoOriginal = movimientoOriginal?.metodoPago || MetodoPago.EFECTIVO;

          await this.cajaService.registrarMovimientoTransaction(manager, {
            sedeId: venta.sedeId,
            tipo: TipoMovimiento.EGRESO,
            monto: Number(venta.montoPagado),
            descripcion: `Egreso por anulación de venta #${venta.id}`,
            ventaId: venta.id,
            metodoPago: metodoPagoOriginal as MetodoPago,
          });
        }

        // 4. Cancelar el seguimiento del pedido si existe (Modularizado)
        await this.anularSeguimientoSiExiste(manager, venta.id);

        // 5. Marcar la venta como inactiva
        venta.activo = false;
        await manager.getRepository(Venta).save(venta);

        return {
          message: 'Venta anulada y stock devuelto correctamente.',
          data: {
            ventaId: venta.id,
            activo: venta.activo,
          },
        };
      } catch (error) {
        console.error(error);
        throw new ConflictException({
          message: error?.message || 'Error al anular venta',
        });
      }
    });
  }

  /**
   * Crea un seguimiento de pedido transaccional para la venta si esta requiere montaje.
   */
  // ✅  METODO REVISADO CON TODOS SUS SUS DTOS Y ENTITIES
  private async registrarSeguimientoSiCorresponde(manager: EntityManager, venta: Venta) {
    if (venta.montaje) {

      const seguimiento = manager.getRepository(SeguimientoPedido).create({
        ventaId: venta.id,
        historial: [
          {
            estado: 'CREADO' as any,
            fechaCambio: new Date().toISOString(),
            observaciones: 'Pedido de montaje creado automáticamente desde la venta.',
          },
        ],
      });
      await manager.getRepository(SeguimientoPedido).save(seguimiento);
    }
  }

  /**
   * Cancela/anula el seguimiento del pedido asociado a una venta si este existe.
   */
  // ✅  METODO REVISADO CON TODOS SUS SUS DTOS Y ENTITIES
  private async anularSeguimientoSiExiste(manager: EntityManager, ventaId: number) {
    const seguimiento = await manager.getRepository(SeguimientoPedido).findOne({
      where: { ventaId },
    });

    if (seguimiento) {
      seguimiento.estado = 'ANULADO';
      const nuevoHistorial = {
        estado: 'ANULADO' as any,
        fechaCambio: new Date().toISOString(),
        observaciones: 'Pedido cancelado por anulación de la venta.',
      };
      seguimiento.historial = [...(seguimiento.historial || []), nuevoHistorial];
      await manager.getRepository(SeguimientoPedido).save(seguimiento);
    }
  }
}
