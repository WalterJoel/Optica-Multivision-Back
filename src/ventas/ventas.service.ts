import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Between } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { VentaProducto } from './entities/ventaProducto.entity';
import { VentaKit } from './entities/ventaKit.entity';
import { SeguimientoPedido } from './entities/seguimientoPedido.entity';
import { Producto, Stock } from '../productos/entities';
import { Kit } from '../kits/entities/kit.entity';
import { CrearVentaDto, VentaProductoDto } from './dto/crear-venta.dto';
import { EditarVentaDto } from './dto/editar-venta.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { MetodoPago, TipoProducto } from 'src/common/constants';
import { CrearSeguimientoPedidoDto } from './dto/crear-seguimiento-pedido-dto';
import { CajaService } from 'src/caja/caja.service';
import { MovimientoCaja, TipoMovimiento } from 'src/caja/entities/movimientoCaja.entity';

import { KardexService } from 'src/kardex/kardex.service';
import { OrigenEventoKardex } from 'src/kardex/entities/kardex.entity';
import { KitsService } from 'src/kits/kits.service';
import { TerminateSessionCommand } from '@aws-sdk/client-ssm';

/**
 * Configuración estandarizada de relaciones para consultar Ventas Completas
 */
export const RELACIONES_VENTA_COMPLETA = {
  sede: true,
  cliente: true,
  user: true,
  productos: {
    producto: {
      montura: true,
      accesorio: true,
    },
    stock: {
      lente: {
        kit: true,
      },
    },
  },
  ventaKits: {
    kit: {
      accesorios: {
        accesorio: true,
      },
    },
  },
};

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(SeguimientoPedido) // (TODO V2)
    private readonly seguimientoRepository: Repository<SeguimientoPedido>,

    private readonly cajaService: CajaService,
    private readonly kardexService: KardexService,
    private readonly kitsService: KitsService,
  ) { }

  // ✅ REVISADO POR JOEL
  async crearVenta(createVentaDto: CrearVentaDto) {
    const { productos, ...ventaData } = createVentaDto;

    return await this.ventaRepository.manager.transaction(async (manager) => {
      try {
        // 1. Determinar los kits de regalo otorgados en la venta (VERIFICADO POR JOEL)
        const kitsRegalo = await this.determinarKitsDeVenta(manager, productos, ventaData.sedeId);

        // 2. Validar, descontar stock y registrar movimientos en el Kardex (Productos vendidos y Kits de regalo)
        await this.descontarStock(manager, productos, kitsRegalo, ventaData.sedeId);

        // 3. Crear y guardar la venta con sus productos y kits en cascada
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

        // Registro los KITS para esta venta(tabla ventaKits)
        venta.ventaKits = kitsRegalo.map((k) => manager.getRepository(VentaKit).create(k));

        const ventaGuardada = await manager.getRepository(Venta).save(venta);

        // 4. [RN-002] Registrar el ingreso correspondiente en caja (Si el monto recibido es 0, no entra a caja pero si descuenta stock)
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

        // 5. Si la venta requiere montaje, crear automáticamente el seguimiento del pedido (TODO V2)
        await this.registrarSeguimientoSiCorresponde(manager, ventaGuardada);

        // 6. Retornar venta completa con sus productos, kits de regalo y relaciones
        const ventaCompleta = await manager.getRepository(Venta).findOne({
          where: { id: ventaGuardada.id },
          relations: RELACIONES_VENTA_COMPLETA,
          order: {
            productos: {
              id: 'ASC',
            },
          },
        });

        return {
          message: 'Venta creada correctamente',
          data: ventaCompleta,
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
   * Valida, descuenta el stock y registra en el Kardex los lentes, monturas, accesorios y KITS de regalo.
   * Emplea un bloqueo de escritura pesimista (SELECT FOR UPDATE) para evitar condiciones de carrera.
   */
  // ✅ REVISADO POR JOEL
  private async descontarStock(
    manager: EntityManager,
    productos: VentaProductoDto[],
    kitsRegalo: { kitId: number; cantidad: number }[] = [],
    sedeId?: number,
  ) {
    // 1. Bloqueo, descuento y Kardex de productos vendidos
    for (const p of productos) {
      // Valida y descuenta stock de lentes
      if (p.tipoProducto === TipoProducto.LENTE) {
        const stock = await manager.getRepository(Stock).findOne({
          where: { id: p.stockId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!stock || stock.cantidad < p.cantidad) {
          throw new ConflictException({
            message: `Stock insuficiente para el lente solicitado.`,
          });
        }

        const cantidadAnterior = stock.cantidad;
        stock.cantidad -= p.cantidad;
        await manager.getRepository(Stock).save(stock);

        // Kardex: Registro de movimiento de Lente
        if (sedeId) {
          await this.kardexService.registrarMovimiento(manager, {
            sedeId,
            tipoProducto: TipoProducto.LENTE,
            stockId: p.stockId,
            origenEvento: OrigenEventoKardex.VENTA_REALIZADA,
            cantidadAnterior,
            cantidadMovimiento: -p.cantidad,
          });
        }
      }
      // Valida y descuenta stock de monturas y accesorios
      else {
        const producto = await manager.getRepository(Producto).findOne({
          where: { id: p.productoId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!producto || producto.cantidad < p.cantidad) {
          throw new ConflictException({
            message: `Stock insuficiente para el producto: ${producto?.nombre || p.productoId}`,
          });
        }

        const cantidadAnterior = producto.cantidad;
        producto.cantidad -= p.cantidad;
        await manager.getRepository(Producto).save(producto);

        // Kardex: Registro de movimiento de Montura / Accesorio
        if (sedeId) {
          await this.kardexService.registrarMovimiento(manager, {
            sedeId,
            tipoProducto: p.tipoProducto,
            productoId: p.productoId,
            origenEvento: OrigenEventoKardex.VENTA_REALIZADA,
            cantidadAnterior,
            cantidadMovimiento: -p.cantidad,
          });
        }
      }
    }

    // 2. [RN-001] Bloqueo, descuento y Kardex de accesorios incluidos en los KITS de regalo otorgados (1 kit por pareja de lunas)
    if (kitsRegalo.length > 0 && sedeId) {
      // Itero por cada KIT
      for (const kr of kitsRegalo) {
        const numKits = kr.cantidad;

        if (numKits <= 0) continue;

        // Buena practica llamar al metodo del modulo de Kits
        const kit = await this.kitsService.obtenerKitConAccesorios(kr.kitId, manager);
        // Itero por cada accesorio del KIT
        if (kit?.accesorios?.length) {
          for (const ka of kit.accesorios) {
            const cantidadADescontar = ka.cantidad * numKits;

            if (ka.accesorio?.id) {
              const productoAccesorio = await manager.getRepository(Producto).findOne({
                where: { accesorioId: ka.accesorio.id, sedeId },
                lock: { mode: 'pessimistic_write' },
              });

              if (!productoAccesorio || productoAccesorio.cantidad < cantidadADescontar) {
                throw new ConflictException({
                  message: `Stock insuficiente para el accesorio '${ka.accesorio.nombre}' del kit '${kit.nombre}' (requerido: ${cantidadADescontar}, disponible: ${productoAccesorio?.cantidad || 0}).`,
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
  }


  async obtenerVentas(sedeId: number) {
    return await this.ventaRepository.find({
      where: { sedeId },
      relations: RELACIONES_VENTA_COMPLETA,
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
      relations: RELACIONES_VENTA_COMPLETA,
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
      relations: RELACIONES_VENTA_COMPLETA,
      order: {
        createdAt: 'DESC',
      },
    });

    const productosMap = new Map<string, any>();

    for (const venta of ventas) {
      for (const prod of venta.productos) {
        const esLente = prod.tipoProducto === TipoProducto.LENTE;

        // Clave para asociar los productos cuando se vendio +1
        const clave = esLente
          ? `LENTE_${prod.stockId}_${prod.esf}_${prod.cyl}`
          : `${prod.tipoProducto}_${prod.productoId}`;

        if (!productosMap.has(clave)) {
          let infoKit: any = null;

          if (esLente) {
            const kitLenteId = prod.stock?.lente?.kit?.id;

            // 1. Buscar en la venta el registro del kit que corresponde al lente vendido
            const ventaKit = venta.ventaKits.find((vk) => vk.kitId === kitLenteId);
            const kit = ventaKit?.kit;

            // Estructurar la información del Kit si la venta lo otorgó
            if (kit) {
              infoKit = {
                id: kit.id,
                nombre: kit.nombre,
                descripcion: kit.descripcion,
                precio: Number(kit.precio),
                accesorios: kit.accesorios.map((ka) => ({
                  id: ka.accesorio.id,
                  nombre: ka.accesorio.nombre,
                  codigo: ka.accesorio.codigoAccesorio,
                  cantidad: ka.cantidad,
                })),
              };
            }
          }

          productosMap.set(clave, {
            ...prod,
            ventaId: venta.id,
            fechaVenta: venta.createdAt,
            lenteId: esLente ? prod.stock?.lente?.id : null,
            nombreSede: venta.sede?.nombre,
            cantidad: Number(prod.cantidad),
            subtotal: Number(prod.subtotal),
            descuento: Number(prod.descuento ?? 0),
            precioUnitario: Number(prod.precioUnitario),
            infoKit,
          });
        } else {
          const item = productosMap.get(clave);
          item.cantidad += Number(prod.cantidad);
          item.subtotal = Number((item.subtotal + Number(prod.subtotal)).toFixed(2));
          item.descuento = Number((item.descuento + Number(prod.descuento ?? 0)).toFixed(2));
        }
      }
    }

    const productosVendidos = Array.from(productosMap.values());

    const typeOrder = {
      [TipoProducto.LENTE]: 1,
      [TipoProducto.MONTURA]: 2,
      [TipoProducto.ACCESORIO]: 3,
    };

    productosVendidos.sort((a, b) => {
      // 1. Tipo Producto (Lente -> Montura -> Accesorio)
      const orderA = typeOrder[a.tipoProducto];
      const orderB = typeOrder[b.tipoProducto];
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Ordenamiento óptico para Lentes (Marca -> Matriz -> s.orden)
      if (a.tipoProducto === TipoProducto.LENTE && b.tipoProducto === TipoProducto.LENTE) {
        const marcaA = a.stock.lente.marca;
        const marcaB = b.stock.lente.marca;
        if (marcaA !== marcaB) return marcaA.localeCompare(marcaB);

        if (a.stock.matrix !== b.stock.matrix) {
          return a.stock.matrix.localeCompare(b.stock.matrix);
        }

        return a.stock.orden - b.stock.orden;
      }

      // 2. Sede (Alfabético)
      const sedeA = a.nombreSede.toLowerCase();
      const sedeB = b.nombreSede.toLowerCase();
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
    // Restamos UTC en las fechas para que sea preciso
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
        .innerJoin('p.accesorio', 'a')
        .select([
          'MIN(vp.id) AS id',
          'vp.productoId AS "productoId"',
          'a.codigoAccesorio AS codigo',
          'a.nombre AS nombre',
          'SUM(vp.cantidad) AS cantidad',
        ])
        .groupBy('vp.productoId')
        .addGroupBy('a.codigoAccesorio')
        .addGroupBy('a.nombre')
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
          's.matrix AS matrix',
          's.orden AS orden',
          'SUM(vp.cantidad) AS cantidad',
          's.esf AS sph',
          's.cyl AS cyl',
        ])
        .groupBy('vp.stockId')
        .addGroupBy('s.lenteId')
        .addGroupBy('l.marca')
        .addGroupBy('l.material')
        .addGroupBy('s.matrix')
        .addGroupBy('s.orden')
        .addGroupBy('s.esf')
        .addGroupBy('s.cyl')
        .orderBy('l.marca', 'ASC')
        .addOrderBy('s.matrix', 'ASC')
        .addOrderBy('s.orden', 'ASC');

      const raw = await qb.getRawMany();
      return raw.map((r) => ({
        ...r,
        id: Number(r.id),
        stockId: Number(r.stockId),
        lenteId: Number(r.lenteId),
        orden: Number(r.orden),
        cantidad: Number(r.cantidad),
        sph: r.sph !== null ? Number(r.sph) : 0,
        cyl: r.cyl !== null ? Number(r.cyl) : 0,
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
        // 1. Buscar la venta con sus productos y kits
        const venta = await manager.getRepository(Venta).findOne({
          where: { id: ventaId },
          relations: ['productos', 'ventaKits'],
        });

        if (!venta) {
          throw new ConflictException({ message: 'Venta no encontrada.' });
        }

        if (!venta.activo) {
          throw new ConflictException({ message: 'La venta ya se encuentra anulada.' });
        }

        // 2. Revertir el stock de forma segura para cada detalle de la venta
        for (const p of venta.productos) {
          // Monturas y accesorios
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
          }
          // Lentes
          else {
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
        await this.revertirStockKitsLente(manager, venta.ventaKits, venta.sedeId);

        // 3. Registrar EGRESO en caja para la devolución // [RN-003]
        if (Number(venta.montoPagado) > 0) {
          // Buscamos el movimiento original para obtener el método de pago correcto
          const movimientoOriginal = await manager.getRepository(MovimientoCaja).findOne({
            where: { ventaId: venta.id, tipo: TipoMovimiento.INGRESO },
          });

          const metodoPagoOriginal = movimientoOriginal?.metodoPago;

          await this.cajaService.registrarMovimientoTransaction(manager, {
            sedeId: venta.sedeId,
            tipo: TipoMovimiento.EGRESO,
            monto: Number(venta.montoPagado),
            descripcion: `Egreso por anulación de venta #${venta.id}`,
            ventaId: venta.id,
            metodoPago: metodoPagoOriginal as MetodoPago,
          });
        }

        // 4. Cancelar el seguimiento del pedido si existe (TODO V2)
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
   * (TODO V2) Crea un seguimiento de pedido transaccional para la venta si esta requiere montaje.
   */
  // ✅ (TODO V2) METODO REVISADO CON TODOS SUS DTOS Y ENTITIES
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
   * (TODO V2) Cancela/anula el seguimiento del pedido asociado a una venta si este existe.
   */
  // ✅ (TODO V2) METODO REVISADO CON TODOS SUS DTOS Y ENTITIES
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
   * Valida y determina la cantidad de kits elegibles según los lentes vendidos.
   */
  // ✅ REVISADO POR JOEL
  private async determinarKitsDeVenta(
    manager: EntityManager,
    productos: VentaProductoDto[],
    sedeId: number,
  ): Promise<{ kitId: number; cantidad: number }[]> {
    // 1. Agrupar la cantidad total de lunas vendidas por cada kit de lente [kitId, totalLunas]
    const lunasPorKit = new Map<number, number>();

    for (const p of productos) {
      if (p.tipoProducto === TipoProducto.LENTE && p.stockId) {
        // Busco la luna
        const stock = await manager.getRepository(Stock).findOne({
          where: { id: p.stockId },
          relations: { lente: { kit: true } },
        });
        // Busco si lente tiene un kit asociado(para todas las series no hay distincion)
        const kit = stock?.lente?.kit;
        // Validar que el kit pertenezca a la sede de la venta
        if (kit && kit.sedeId === Number(sedeId)) {
          // Suma lunas al kit correspondiente
          const totalLunas = lunasPorKit.get(kit.id) ?? 0;
          lunasPorKit.set(kit.id, totalLunas + p.cantidad);
        }
      }
    }

    // 2. Aplicar Regla de Negocio: 1 Kit por cada 2 Lunas vendidas (Math.floor(totalLunas / 2))
    const totalKits: { kitId: number; cantidad: number }[] = [];
    for (const [kitId, totalLunas] of lunasPorKit.entries()) {
      // Un kit cada dos lunas
      const cantidadKits = Math.floor(totalLunas / 2);
      if (cantidadKits > 0) {
        // Agrega kit si le corresponde
        totalKits.push({ kitId, cantidad: cantidadKits });
      }
    }

    return totalKits;
  }



  /**
   * REGLA DE NEGOCIO: 1 Kit por cada 2 lunas del mismo tipo de lente (Math.floor(totalLunas / 2))
   * Revierte el stock de los accesorios incluidos en los kits de los lentes vendidos cuando se anula una venta.
   */
  private async revertirStockKitsLente(
    manager: EntityManager,
    kits: VentaKit[],
    sedeId: number,
  ) {
    if (!kits || kits.length === 0) return;

    for (const vk of kits) {
      const numKits = vk.cantidad;
      if (numKits <= 0) continue;
      // Buena practica llamar al metodo del modulo de Kits
      const kit = await this.kitsService.obtenerKitConAccesorios(vk.kitId, manager);

      if (kit?.accesorios?.length) {
        for (const ka of kit.accesorios) {
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

    if (!venta.activo) {
      throw new BadRequestException({ message: `No se puede editar una venta que se encuentra anulada.` });
    }

    if (dto.nroCuotas !== undefined) {
      if (venta.estadoPago === 'PAGADO' || Number(venta.deuda) <= 0) {
        throw new BadRequestException({
          message: `No se puede modificar el número de cuotas de una venta que ya está completamente pagada.`,
        });
      }

      // Consultar directamente de la tabla de movimientos de caja los pagos/abonos realizados
      const pagosRealizados = await this.ventaRepository.manager
        .getRepository(MovimientoCaja)
        .count({
          where: {
            ventaId: id,
            tipo: TipoMovimiento.INGRESO,
          },
        });

      if (dto.nroCuotas < pagosRealizados && Number(venta.deuda) > 0) {
        throw new BadRequestException({
          message: `La venta ya registra ${pagosRealizados} pago(s)/abono(s) en caja. El número de cuotas no puede ser menor a los pagos ya registrados (${pagosRealizados}).`,
        });
      }

      venta.nroCuotas = dto.nroCuotas;
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
