import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Between } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { VentaProducto } from './entities/ventaProducto.entity';
import { SeguimientoPedido } from './entities/seguimientoPedido.entity';
import { Producto, Stock } from '../productos/entities';
import { CrearVentaDto, VentaProductoDto } from './dto/crear-venta.dto';
import { EditarVentaDto } from './dto/editar-venta.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { MetodoPago, TipoProducto } from 'src/common/constants';
import { CrearSeguimientoPedidoDto } from './dto/crear-seguimiento-pedido-dto';
import { CajaService } from 'src/caja/caja.service';
import { MovimientoCaja, TipoMovimiento } from 'src/caja/entities/movimientoCaja.entity';

import { KardexService } from 'src/kardex/kardex.service';
import { OrigenEventoKardex } from 'src/kardex/entities/kardex.entity';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(SeguimientoPedido)
    private readonly seguimientoRepository: Repository<SeguimientoPedido>,

    private readonly cajaService: CajaService,
    private readonly kardexService: KardexService,
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

        // 2.1 Validar y descontar stock de los accesorios incluidos en los KITS de los lentes vendidos (si aplica)
        await this.descontarStockKitsLente(manager, productos, ventaData.sedeId);

        // 2.2 Registrar movimientos de venta en el Kardex
        for (const p of productos) {
          if (p.tipoProducto === TipoProducto.LENTE) {
            const stock = await manager.getRepository(Stock).findOne({ where: { id: p.stockId } });
            if (stock) {
              // Kardex: Registro de movimiento
              await this.kardexService.registrarMovimiento(manager, {
                sedeId: ventaData.sedeId,
                tipoProducto: TipoProducto.LENTE,
                stockId: p.stockId,
                origenEvento: OrigenEventoKardex.VENTA_REALIZADA,
                cantidadAnterior: stock.cantidad + p.cantidad,
                cantidadMovimiento: -p.cantidad,
              });
            }
          } else {
            const producto = await manager.getRepository(Producto).findOne({ where: { id: p.productoId } });
            if (producto) {
              // Kardex: Registro de movimiento
              await this.kardexService.registrarMovimiento(manager, {
                sedeId: ventaData.sedeId,
                tipoProducto: p.tipoProducto,
                productoId: p.productoId,
                origenEvento: OrigenEventoKardex.VENTA_REALIZADA,
                cantidadAnterior: producto.cantidad + p.cantidad,
                cantidadMovimiento: -p.cantidad,
              });
            }
          }
        }

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

        const ventaCompleta = await manager.getRepository(Venta).findOne({
          where: { id: ventaGuardada.id },
          relations: {
            productos: {
              producto: {
                montura: true,
                accesorio: true,
              },
              stock: {
                lente: true,
              },
            },
            cliente: true,
            user: true,
          },
        });

        return {
          message: 'Venta creada correctamente',
          data: ventaCompleta || ventaGuardada,
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
        productos: {
          producto: {
            montura: true,
            accesorio: true,
          },
          stock: {
            lente: true,
          },
        },
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
        productos: {
          producto: {
            montura: true,
            accesorio: true,
          },
          stock: {
            lente: true,
          },
        },
        cliente: true,
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async buscarProductosVendidosPorRango(sedeId: number, fechaInicio: string, fechaFin: string) {
    const start = new Date(`${fechaInicio}T00:00:00.000-05:00`);
    const end = new Date(`${fechaFin}T23:59:59.999-05:00`);

    const ventas = await this.ventaRepository.find({
      where: {
        sedeId,
        createdAt: Between(start, end),
        activo: true,
      },
      relations: {
        sede: true,
        productos: {
          producto: {
            montura: true,
            accesorio: true,
          },
          stock: {
            lente: true,
          },
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const productosVendidos: any[] = [];
    for (const venta of ventas) {
      for (const prod of venta.productos) {
        productosVendidos.push({
          ...prod,
          ventaId: venta.id,
          fechaVenta: venta.createdAt,
          lenteId: prod.tipoProducto === TipoProducto.LENTE ? (prod.stock?.lente?.id || null) : null,
          nombreSede: venta.sede?.nombre || null,
        });
      }
    }

    const typeOrder = {
      [TipoProducto.LENTE]: 1,
      [TipoProducto.MONTURA]: 2,
      [TipoProducto.ACCESORIO]: 3,
    };

    productosVendidos.sort((a, b) => {
      // 1. Tipo Producto (Lente -> Montura -> Accesorio)
      const orderA = typeOrder[a.tipoProducto] || 99;
      const orderB = typeOrder[b.tipoProducto] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // 2. Sede (Alfabético)
      const sedeA = String(a.nombreSede || '').toLowerCase();
      const sedeB = String(b.nombreSede || '').toLowerCase();
      if (sedeA !== sedeB) {
        return sedeA.localeCompare(sedeB);
      }

      // 3. Fecha de Venta (Cronológico / Ascendente)
      const dateA = new Date(a.fechaVenta).getTime();
      const dateB = new Date(b.fechaVenta).getTime();
      return dateA - dateB;
    });

    return productosVendidos;
  }

  async buscarVentasPorRangoTipo(
    sedeId: number,
    fechaInicio: string,
    fechaFin: string,
    tipo: TipoProducto,
  ) {
    const start = new Date(`${fechaInicio}T00:00:00.000-05:00`);
    const end = new Date(`${fechaFin}T23:59:59.999-05:00`);

    const qb = this.ventaRepository.manager
      .getRepository(VentaProducto)
      .createQueryBuilder('vp')
      .innerJoin('vp.venta', 'v')
      .where('v.sedeId = :sedeId', { sedeId })
      .andWhere('v.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('v.activo = true')
      .andWhere('vp.tipoProducto = :tipo', { tipo });

    if (tipo === TipoProducto.MONTURA) {
      qb.innerJoin('vp.producto', 'p')
        .innerJoin('p.montura', 'm')
        .select([
          'MIN(vp.id) AS id',
          'vp.productoId AS "productoId"',
          'm.codigo AS codigo',
          'm.marca AS marca',
          'm.material AS material',
          'SUM(vp.cantidad) AS cantidad',
        ])
        .groupBy('vp.productoId')
        .addGroupBy('m.codigo')
        .addGroupBy('m.marca')
        .addGroupBy('m.material')
        .orderBy('MAX(v.createdAt)', 'DESC');

      const raw = await qb.getRawMany();
      return raw.map((r) => ({
        ...r,
        id: Number(r.id),
        productoId: Number(r.productoId),
        cantidad: Number(r.cantidad),
      }));
    }

    if (tipo === TipoProducto.ACCESORIO) {
      qb.innerJoin('vp.producto', 'p')
        .leftJoin('p.accesorio', 'a')
        .select([
          'MIN(vp.id) AS id',
          'vp.productoId AS "productoId"',
          "COALESCE(a.codigoAccesorio, '') AS codigo",
          "COALESCE(a.nombre, p.nombre, '') AS nombre",
          'SUM(vp.cantidad) AS cantidad',
        ])
        .groupBy('vp.productoId')
        .addGroupBy('a.codigoAccesorio')
        .addGroupBy('a.nombre')
        .addGroupBy('p.nombre')
        .orderBy('MAX(v.createdAt)', 'DESC');

      const raw = await qb.getRawMany();
      return raw.map((r) => ({
        ...r,
        id: Number(r.id),
        productoId: Number(r.productoId),
        cantidad: Number(r.cantidad),
      }));
    }

    if (tipo === TipoProducto.LENTE) {
      qb.innerJoin('vp.stock', 's')
        .innerJoin('s.lente', 'l')
        .select([
          'MIN(vp.id) AS id',
          'vp.stockId AS "stockId"',
          's.lenteId AS "lenteId"',
          'l.marca AS marca',
          'l.material AS material',
          'SUM(vp.cantidad) AS cantidad',
          'COALESCE(vp.esf, s.esf) AS sph',
          'COALESCE(vp.cyl, s.cyl) AS cyl',
        ])
        .groupBy('vp.stockId')
        .addGroupBy('s.lenteId')
        .addGroupBy('l.marca')
        .addGroupBy('l.material')
        .addGroupBy('COALESCE(vp.esf, s.esf)')
        .addGroupBy('COALESCE(vp.cyl, s.cyl)')
        .orderBy('MAX(v.createdAt)', 'DESC');

      const raw = await qb.getRawMany();
      return raw.map((r) => ({
        ...r,
        id: Number(r.id),
        stockId: Number(r.stockId),
        lenteId: Number(r.lenteId),
        cantidad: Number(r.cantidad),
        sph: r.sph !== null ? Number(r.sph) : null,
        cyl: r.cyl !== null ? Number(r.cyl) : null,
      }));
    }

    return [];
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
                const cantidadAnterior = stock.cantidad;
                stock.cantidad += p.cantidad;
                await manager.getRepository(Stock).save(stock);

                // Kardex: Registro de movimiento
                await this.kardexService.registrarMovimiento(manager, {
                  sedeId: venta.sedeId,
                  tipoProducto: TipoProducto.LENTE,
                  stockId: p.stockId,
                  origenEvento: OrigenEventoKardex.VENTA_ANULADA,
                  cantidadAnterior,
                  cantidadMovimiento: p.cantidad,
                });
              }
            }
          } else {
            if (p.productoId) {
              const producto = await manager.getRepository(Producto).findOne({
                where: { id: p.productoId },
                lock: { mode: 'pessimistic_write' },
              });
              if (producto) {
                const cantidadAnterior = producto.cantidad;
                producto.cantidad += p.cantidad;
                await manager.getRepository(Producto).save(producto);

                // Kardex: Registro de movimiento
                await this.kardexService.registrarMovimiento(manager, {
                  sedeId: venta.sedeId,
                  tipoProducto: p.tipoProducto as TipoProducto,
                  productoId: p.productoId,
                  origenEvento: OrigenEventoKardex.VENTA_ANULADA,
                  cantidadAnterior,
                  cantidadMovimiento: p.cantidad,
                });
              }
            }
          }
        }

        // 2.1 Revertir el stock de accesorios incluidos en los KITS de los lentes vendidos (si aplica)
        await this.revertirStockKitsLente(manager, venta.productos, venta.sedeId);

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
   * REGLA DE NEGOCIO: 1 Kit por cada 2 lunas del mismo tipo de lente (Math.floor(totalLunas / 2))
   * Valida y descuenta de manera segura el stock de los accesorios incluidos en los kits de los lentes vendidos.
   */
  private async descontarStockKitsLente(
    manager: EntityManager,
    productos: VentaProductoDto[],
    sedeId: number,
  ) {
    // 1. Agrupar la cantidad total de lunas vendidas por cada tipo de lente (lenteId)
    const lunasPorLente = new Map<number, { cantidadTotal: number; stockMuestra: Stock }>();

    for (const p of productos) {
      if (p.tipoProducto === TipoProducto.LENTE && p.stockId) {
        const stock = await manager.getRepository(Stock).findOne({
          where: { id: p.stockId },
          relations: ['lente', 'lente.kit', 'lente.kit.accesorios', 'lente.kit.accesorios.accesorio'],
        });

        if (stock?.lenteId && stock.lente?.kit) {
          // Validar estrictamente que el kit pertenezca a la sede de la venta
          if (stock.lente.kit.sedeId !== sedeId) {
            continue;
          }

          const current = lunasPorLente.get(stock.lenteId) || {
            cantidadTotal: 0,
            stockMuestra: stock,
          };
          current.cantidadTotal += p.cantidad;
          lunasPorLente.set(stock.lenteId, current);
        }
      }
    }

    // 2. Aplicar Regla de Negocio: Math.floor(cantidadTotal / 2) kits por tipo de lente
    for (const { cantidadTotal, stockMuestra } of lunasPorLente.values()) {
      // REGLA DE NEGOCIO: 1 Kit por cada 2 Lunas vendidas del mismo tipo de lente (Math.floor(totalLunas / 2))
      const numKits = Math.floor(cantidadTotal / 2);
      if (numKits <= 0) continue;

      if (stockMuestra.lente?.kit?.accesorios?.length) {
        for (const ka of stockMuestra.lente.kit.accesorios) {
          const cantidadADescontar = ka.cantidad * numKits;

          if (ka.accesorio?.id) {
            const productoAccesorio = await manager.getRepository(Producto).findOne({
              where: { accesorioId: ka.accesorio.id, sedeId },
              lock: { mode: 'pessimistic_write' },
            });

            if (!productoAccesorio || productoAccesorio.cantidad < cantidadADescontar) {
              throw new ConflictException({
                message: `Stock insuficiente para el accesorio '${ka.accesorio.nombre}' del kit '${stockMuestra.lente.kit.nombre}' (requerido: ${cantidadADescontar}, disponible: ${productoAccesorio?.cantidad || 0}).`,
              });
            }

            const cantidadAnterior = productoAccesorio.cantidad;
            productoAccesorio.cantidad -= cantidadADescontar;
            await manager.getRepository(Producto).save(productoAccesorio);

            // Kardex: Registro de movimiento
            await this.kardexService.registrarMovimiento(manager, {
              sedeId,
              tipoProducto: TipoProducto.ACCESORIO,
              productoId: productoAccesorio.id,
              origenEvento: OrigenEventoKardex.VENTA_KIT_ACCESORIO,
              cantidadAnterior,
              cantidadMovimiento: -cantidadADescontar,
            });
          }
        }
      }
    }
  }

  /**
   * REGLA DE NEGOCIO: 1 Kit por cada 2 lunas del mismo tipo de lente (Math.floor(totalLunas / 2))
   * Revierte el stock de los accesorios incluidos en los kits de los lentes vendidos cuando se anula una venta.
   */
  private async revertirStockKitsLente(
    manager: EntityManager,
    productos: VentaProducto[],
    sedeId: number,
  ) {
    // 1. Agrupar la cantidad total de lunas vendidas por cada tipo de lente (lenteId)
    const lunasPorLente = new Map<number, { cantidadTotal: number; stockMuestra: Stock }>();

    for (const p of productos) {
      if (p.tipoProducto === TipoProducto.LENTE && p.stockId) {
        const stock = await manager.getRepository(Stock).findOne({
          where: { id: p.stockId },
          relations: ['lente', 'lente.kit', 'lente.kit.accesorios', 'lente.kit.accesorios.accesorio'],
        });

        if (stock?.lenteId && stock.lente?.kit) {
          // Validar estrictamente que el kit pertenezca a la sede de la venta
          if (stock.lente.kit.sedeId !== sedeId) {
            continue;
          }

          const current = lunasPorLente.get(stock.lenteId) || {
            cantidadTotal: 0,
            stockMuestra: stock,
          };
          current.cantidadTotal += p.cantidad;
          lunasPorLente.set(stock.lenteId, current);
        }
      }
    }

    // 2. Aplicar Regla de Negocio: Math.floor(cantidadTotal / 2) kits por tipo de lente
    for (const { cantidadTotal, stockMuestra } of lunasPorLente.values()) {
      // REGLA DE NEGOCIO: 1 Kit por cada 2 Lunas vendidas del mismo tipo de lente (Math.floor(totalLunas / 2))
      const numKits = Math.floor(cantidadTotal / 2);
      if (numKits <= 0) continue;

      if (stockMuestra.lente?.kit?.accesorios?.length) {
        for (const ka of stockMuestra.lente.kit.accesorios) {
          const cantidadARevertir = ka.cantidad * numKits;

          if (ka.accesorio?.id) {
            const productoAccesorio = await manager.getRepository(Producto).findOne({
              where: { accesorioId: ka.accesorio.id, sedeId },
              lock: { mode: 'pessimistic_write' },
            });

            if (productoAccesorio) {
              const cantidadAnterior = productoAccesorio.cantidad;
              productoAccesorio.cantidad += cantidadARevertir;
              await manager.getRepository(Producto).save(productoAccesorio);

              // Kardex: Registro de movimiento
              await this.kardexService.registrarMovimiento(manager, {
                sedeId,
                tipoProducto: TipoProducto.ACCESORIO,
                productoId: productoAccesorio.id,
                origenEvento: OrigenEventoKardex.ANULACION_KIT_ACCESORIO,
                cantidadAnterior,
                cantidadMovimiento: cantidadARevertir,
              });
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

  async editarVenta(id: number, dto: EditarVentaDto) {
    const venta = await this.ventaRepository.findOne({
      where: { id },
    });

    if (!venta) {
      throw new NotFoundException({ message: `La venta #${id} no existe.` });
    }

    if (dto.observaciones !== undefined) venta.observaciones = dto.observaciones;
    if (dto.montaje !== undefined) venta.montaje = dto.montaje;
    if (dto.diasCompromisoPago !== undefined) venta.diasCompromisoPago = dto.diasCompromisoPago;
    if (dto.clienteId !== undefined) venta.clienteId = dto.clienteId;
    if (dto.metodoPago !== undefined) venta.metodoPago = dto.metodoPago as MetodoPago;
    if (dto.tipoComprobante !== undefined) venta.tipoComprobante = dto.tipoComprobante;
    if (dto.nroComprobante !== undefined) venta.nroComprobante = dto.nroComprobante;

    return await this.ventaRepository.save(venta);
  }

  async registrarPago(id: number, dto: RegistrarPagoDto) {
    const venta = await this.ventaRepository.findOne({ where: { id } });

    if (!venta) throw new NotFoundException({ message: `La venta #${id} no existe.` });
    if (!venta.activo) throw new BadRequestException({ message: `La venta #${id} está anulada.` });
    if (venta.estadoPago === 'PAGADO' || Number(venta.deuda) <= 0) {
      throw new BadRequestException({ message: `La venta #${id} ya está completamente pagada.` });
    }

    const montoAnterior = Number(venta.montoPagado);
    const total = Number(venta.total);
    const nuevaMontoPagado = Math.min(montoAnterior + dto.montoPagado, total);
    const nuevaDeuda = Math.max(total - nuevaMontoPagado, 0);
    const nuevoEstado = nuevaDeuda <= 0 ? 'PAGADO' : 'PENDIENTE';

    venta.montoPagado = nuevaMontoPagado;
    venta.deuda = nuevaDeuda;
    venta.estadoPago = nuevoEstado as any;

    await this.ventaRepository.save(venta);

    // Registrar ingreso en caja
    await this.cajaService.registrarMovimiento({
      sedeId: dto.sedeId,
      tipo: TipoMovimiento.INGRESO,
      monto: dto.montoPagado,
      descripcion: `Pago de cuota venta #${id} (${nuevoEstado === 'PAGADO' ? 'saldado' : 'parcial'})`,
      ventaId: id,
      metodoPago: dto.metodoPago as MetodoPago,
    });

    return {
      message: nuevoEstado === 'PAGADO'
        ? 'Venta saldada completamente.'
        : `Pago registrado. Deuda restante: S/. ${nuevaDeuda.toFixed(2)}`,
      montoPagado: nuevaMontoPagado,
      deuda: nuevaDeuda,
      estadoPago: nuevoEstado,
    };
  }
}
