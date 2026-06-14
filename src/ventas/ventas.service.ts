import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Between } from 'typeorm';
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

        // 1.1 Validar y descontar stock de los accesorios incluidos en los KITS de los lentes vendidos (si aplica)
        await this.descontarStockKitsLente(manager, productos);

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
          console.log()
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
        console.log(producto?.cantidad, ' EN BD', p.cantidad, 'EN LOTE')
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


  async obtenerVentas(sedeId: number) {
    return await this.ventaRepository.find({
      where: { sedeId },
      relations: {
        productos: true,
        cliente: true,
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async buscarVentasPorRango(sedeId: number, fechaInicio: string, fechaFin: string) {
    const start = new Date(`${fechaInicio}T00:00:00.000-05:00`);
    const end = new Date(`${fechaFin}T23:59:59.999-05:00`);

    return await this.ventaRepository.find({
      where: {
        sedeId,
        createdAt: Between(start, end),
      },
      relations: {
        productos: true,
        cliente: true,
        user: true,
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
          throw new ConflictException({ message: 'Venta no encontrada.' });
        }

        if (!venta.activo) {
          throw new ConflictException({ message: 'La venta ya se encuentra anulada.' });
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

        // 2.1 Revertir el stock de accesorios incluidos en los KITS de los lentes vendidos (si aplica)
        await this.revertirStockKitsLente(manager, venta.productos);

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

  /**
   * Valida y descuenta de manera segura el stock de los accesorios incluidos en los kits de los lentes vendidos.
   */
  private async descontarStockKitsLente(manager: EntityManager, productos: VentaProductoDto[]) {
    for (const p of productos) {
      if (p.tipoProducto === TipoProducto.LENTE && p.stockId) {
        // 1. Obtener la fila de stock del lente, cargando su lente, el kit asignado y sus accesorios de forma recursiva
        const stock = await manager.getRepository(Stock).findOne({
          where: { id: p.stockId },
          relations: ['lente', 'lente.kit', 'lente.kit.accesorios', 'lente.kit.accesorios.accesorio'],
        });

        // 2. Si el lente tiene un kit asignado y tiene accesorios asociados
        if (stock?.lente?.kit?.accesorios?.length) {
          for (const ka of stock.lente.kit.accesorios) {
            const cantidadADescontar = ka.cantidad * p.cantidad;

            // 3. Buscar el producto general correspondiente al accesorio del kit para descontar su stock
            if (ka.accesorio?.productoId) {
              const productoAccesorio = await manager.getRepository(Producto).findOne({
                where: { id: ka.accesorio.productoId },
                lock: { mode: 'pessimistic_write' },
              });

              if (!productoAccesorio || productoAccesorio.cantidad < cantidadADescontar) {
                throw new ConflictException(
                  `Stock insuficiente para el accesorio '${ka.accesorio.nombre}' del kit '${stock.lente.kit.nombre}' (requerido: ${cantidadADescontar}, disponible: ${productoAccesorio?.cantidad || 0}).`
                );
              }

              productoAccesorio.cantidad -= cantidadADescontar;
              await manager.getRepository(Producto).save(productoAccesorio);
            }
          }
        }
      }
    }
  }

  /**
   * Revierte el stock de los accesorios incluidos en los kits de los lentes vendidos cuando se anula una venta.
   */
  private async revertirStockKitsLente(manager: EntityManager, productos: VentaProducto[]) {
    for (const p of productos) {
      if (p.tipoProducto === TipoProducto.LENTE && p.stockId) {
        // 1. Obtener el lente y su kit con sus accesorios
        const stock = await manager.getRepository(Stock).findOne({
          where: { id: p.stockId },
          relations: ['lente', 'lente.kit', 'lente.kit.accesorios', 'lente.kit.accesorios.accesorio'],
        });

        // 2. Si tiene un kit y tiene accesorios, sumamos de vuelta al stock general
        if (stock?.lente?.kit?.accesorios?.length) {
          for (const ka of stock.lente.kit.accesorios) {
            const cantidadARevertir = ka.cantidad * p.cantidad;

            if (ka.accesorio?.productoId) {
              const productoAccesorio = await manager.getRepository(Producto).findOne({
                where: { id: ka.accesorio.productoId },
                lock: { mode: 'pessimistic_write' },
              });

              if (productoAccesorio) {
                productoAccesorio.cantidad += cantidadARevertir;
                await manager.getRepository(Producto).save(productoAccesorio);
              }
            }
          }
        }
      }
    }
  }
  /* Revisa si un cliente tiene deudas en base a su compromisoDePago */
  async revisarDeudas(clienteId: number) {
    const ventas = await this.ventaRepository.find({
      where: {
        clienteId,
        estadoPago: 'PENDIENTE',
        activo: true,
      },
      relations: ['cliente'],
    });
    const deudasVencidas: any[] = [];
    const fechaActual = new Date();
    let totalDeudaVencida = 0;

    for (const venta of ventas) {
      if (!venta.diasCompromisoPago) continue;

      const fechaLimite = new Date(venta.createdAt);
      fechaLimite.setDate(fechaLimite.getDate() + venta.diasCompromisoPago);

      if (fechaLimite < fechaActual) {
        const diffTime = Math.abs(fechaActual.getTime() - fechaLimite.getTime());
        const diasVencidos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const deudasNum = Number(venta.deuda) || 0;

        deudasVencidas.push({
          id: venta.id,
          total: Number(venta.total),
          montoPagado: Number(venta.montoPagado),
          deuda: deudasNum,
          createdAt: venta.createdAt,
          fechaLimite,
          diasVencidos,
        });

        totalDeudaVencida += deudasNum;
      }
    }

    const tieneDeudasVencidas = deudasVencidas.length > 0;
    let mensaje = 'El cliente no registra deudas vencidas.';

    if (tieneDeudasVencidas) {
      const cliente = ventas[0]?.cliente;
      const nombreCliente = cliente ? `${cliente.nombres} ${cliente.apellidos}`.trim() : 'Cliente';
      mensaje = `El cliente ${nombreCliente} tiene ${deudasVencidas.length} deuda(s) vencida(s) de compromiso de pago por un total de S/. ${totalDeudaVencida.toFixed(2)}.`;
    }

    return {
      tieneDeudasVencidas,
      mensaje,
      deudasVencidas,
    };
  }
}
