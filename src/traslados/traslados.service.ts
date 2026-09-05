import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import { Traslado } from './entities/traslado.entity';
import { TrasladoDetalle } from './entities/trasladoDetalle.entity';
import { CrearTrasladoDto } from './dto/crear-traslado.dto';
import { EnviarMercaderiaDto } from './dto/enviar-mercaderia.dto';
import { RecibirMercaderiaDto } from './dto/recibir-mercaderia.dto';
import { EstadoTraslado, TipoProducto } from 'src/common/constants';
import { Producto, Stock } from 'src/productos/entities';
import { KardexService } from 'src/kardex/kardex.service';
import { Kardex, OrigenEventoKardex } from 'src/kardex/entities/kardex.entity';

@Injectable()
export class TrasladosService {
  constructor(
    @InjectRepository(Traslado)
    private readonly trasladoRepository: Repository<Traslado>,
    @InjectRepository(TrasladoDetalle)
    private readonly trasladoDetalleRepository: Repository<TrasladoDetalle>,
    private readonly dataSource: DataSource,
    private readonly kardexService: KardexService,
  ) { }

  async crearTraslado(dto: CrearTrasladoDto): Promise<Traslado> {
    if (dto.sedeProveedoraId === dto.sedeSolicitanteId) {
      throw new BadRequestException({
        message: 'La sede proveedora y la sede solicitante no pueden ser la misma',
      });
    }

    const traslado = this.trasladoRepository.create({
      origenSolicitud: dto.origenSolicitud,
      sedeProveedoraId: dto.sedeProveedoraId,
      sedeSolicitanteId: dto.sedeSolicitanteId,
      usuarioSolicitanteId: dto.usuarioSolicitanteId,
      observaciones: dto.observaciones,
      estado: EstadoTraslado.SOLICITADO,
      detalles: dto.detalles.map((det) =>
        this.trasladoDetalleRepository.create({
          tipoProducto: det.tipoProducto,
          productoId: det.productoId || null,
          stockId: det.stockId || null,
          cantidadSolicitada: det.cantidadSolicitada || det.cantidad || 0,
          cantidadEnviada: 0,
          cantidadRecibida: 0,
          observacion: det.observacion || null,
        }),
      ),
    });

    return await this.trasladoRepository.save(traslado);
  }

  /**
   * ENVIAR MERCADERÍA Y VERIFICAR DISPONIBILIDAD EN SEDE PROVEEDORA
   */
  async enviarMercaderia(dto: EnviarMercaderiaDto): Promise<Traslado> {
    const traslado = await this.trasladoRepository.findOne({
      where: { id: dto.trasladoId },
      relations: ['detalles'],
    });

    // Early returns
    if (!traslado) {
      throw new NotFoundException({
        message: `Traslado con ID ${dto.trasladoId} no encontrado`,
      });
    }

    if (traslado.estado !== EstadoTraslado.SOLICITADO) {
      throw new BadRequestException({
        message: `El traslado se encuentra en estado ${traslado.estado}. Solo se puede enviar un traslado en estado SOLICITADO.`,
      });
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Recopilar IDs de referencia de los detalles del traslado
      const stockIdsRef = traslado.detalles.map((d) => d.stockId).filter(Boolean) as number[];
      const productoIdsRef = traslado.detalles.map((d) => d.productoId).filter(Boolean) as number[];

      // 2. Cargar stocks(lentes) y productos de la sede solicitante (origen del traslado)
      const stocksOrigen =
        stockIdsRef.length > 0
          ? await manager.getRepository(Stock).find({
            where: { id: In(stockIdsRef) },
            relations: ['lente'],
          })
          : [];

      const productosOrigen =
        productoIdsRef.length > 0
          ? await manager.getRepository(Producto).find({
            where: { id: In(productoIdsRef) },
            relations: ['montura', 'accesorio'],
          })
          : [];

      // 3. Cargar los equivalentes en la sede proveedora (los registros que se van a descontar)
      const stocksProveedora =
        stocksOrigen.length > 0
          ? await manager.getRepository(Stock).find({
            where: stocksOrigen.map((s) => ({
              sedeId: traslado.sedeProveedoraId,
              lenteId: s.lenteId,
              matrix: s.matrix,
              row: s.row,
              col: s.col,
            })),
            lock: { mode: 'pessimistic_write' },
          })
          : [];

      const whereProductosProveedora = productosOrigen.map((p) => {
        if (p.monturaId) return { sedeId: traslado.sedeProveedoraId, monturaId: p.monturaId };
        if (p.accesorioId) return { sedeId: traslado.sedeProveedoraId, accesorioId: p.accesorioId };
        return { sedeId: traslado.sedeProveedoraId, nombre: p.nombre, tipo: p.tipo };
      });

      const productosProveedora =
        whereProductosProveedora.length > 0
          ? await manager.getRepository(Producto).find({
            where: whereProductosProveedora,
            lock: { mode: 'pessimistic_write' },
          })
          : [];

      // 4. Validar disponibilidad y preparar cambios en memoria (sin tocar la BD todavía)
      const faltantes: Array<{ detalleId: number; producto: string; suficiente: boolean }> = [];
      const stocksADescontar: Stock[] = [];
      const productosADescontar: Producto[] = [];
      const movimientosKardex: any[] = [];

      for (const item of dto.detalles) {
        const detalle = traslado.detalles.find((d) => d.id === item.detalleId);
        if (!detalle) {
          throw new NotFoundException({
            message: `Detalle con ID ${item.detalleId} no pertenece al traslado`,
          });
        }

        if (item.cantidadEnviada <= 0) continue;
        detalle.cantidadEnviada = item.cantidadEnviada;

        if (detalle.stockId) {
          // Lente: buscar el stock equivalente en la proveedora por (lenteId, matrix, row, col)
          const stockOrigen = stocksOrigen.find((s) => s.id === detalle.stockId);
          const stockProveedora = stocksProveedora.find(
            (sp) =>
              sp.lenteId === stockOrigen?.lenteId &&
              sp.matrix === stockOrigen?.matrix &&
              sp.row === stockOrigen?.row &&
              sp.col === stockOrigen?.col,
          );

          if (!stockProveedora || stockProveedora.cantidad < item.cantidadEnviada) {
            // stockOrigen tiene lente cargado via relations, stockProveedora no
            const nombre = stockOrigen
              ? `${stockOrigen.lente?.marca} ${stockOrigen.lente?.material} (ESF: ${stockOrigen.esf ?? 0}, CYL: ${stockOrigen.cyl ?? 0})`
              : 'Lente no encontrado';
            faltantes.push({ detalleId: detalle.id, producto: nombre, suficiente: false });
          } else {
            const cantidadAnterior = stockProveedora.cantidad;
            stockProveedora.cantidad -= item.cantidadEnviada;
            stocksADescontar.push(stockProveedora);

            movimientosKardex.push({
              sedeId: traslado.sedeProveedoraId,
              tipoProducto: TipoProducto.LENTE,
              stockId: stockProveedora.id,
              origenEvento: OrigenEventoKardex.TRASLADO_ENVIADO,
              cantidadAnterior,
              cantidadMovimiento: -item.cantidadEnviada,
              cantidadFinal: cantidadAnterior - item.cantidadEnviada,
            });
          }
        } else if (detalle.productoId) {
          // Montura / Accesorio: buscar el producto equivalente en la proveedora por monturaId o accesorioId
          const productoOrigen = productosOrigen.find((p) => p.id === detalle.productoId);
          const productoProveedora = productosProveedora.find((p) => {
            if (productoOrigen?.monturaId) return p.monturaId === productoOrigen.monturaId;
            if (productoOrigen?.accesorioId) return p.accesorioId === productoOrigen.accesorioId;
            return p.nombre === productoOrigen?.nombre && p.tipo === productoOrigen?.tipo;
          });

          if (!productoProveedora || productoProveedora.cantidad < item.cantidadEnviada) {
            // El nombre del producto es igual en todas las sedes (mismo monturaId/accesorioId)
            const nombre = productoOrigen?.nombre ?? 'Producto no encontrado';
            faltantes.push({ detalleId: detalle.id, producto: nombre, suficiente: false });
          } else {
            const cantidadAnterior = productoProveedora.cantidad;
            productoProveedora.cantidad -= item.cantidadEnviada;
            productosADescontar.push(productoProveedora);

            movimientosKardex.push({
              sedeId: traslado.sedeProveedoraId,
              tipoProducto: detalle.tipoProducto,
              productoId: productoProveedora.id,
              origenEvento: OrigenEventoKardex.TRASLADO_ENVIADO,
              cantidadAnterior,
              cantidadMovimiento: -item.cantidadEnviada,
              cantidadFinal: cantidadAnterior - item.cantidadEnviada,
            });
          }
        }
      }

      if (faltantes.length > 0) {
        const listaTexto = faltantes.map((f) => `• ${f.producto}`).join('\n');
        throw new BadRequestException({
          message: `Stock insuficiente en sede proveedora:\n\n${listaTexto}`,
          detalles: faltantes,
        });
      }

      // 5. Persistir: descontar cantidades, registrar en kardex y marcar traslado como ENVIADO
      traslado.estado = EstadoTraslado.ENVIADO;

      if (stocksADescontar.length > 0) {
        await manager.getRepository(Stock).save(stocksADescontar);
      }
      if (productosADescontar.length > 0) {
        await manager.getRepository(Producto).save(productosADescontar);
      }
      if (movimientosKardex.length > 0) {
        const kardexEntities = manager.getRepository(Kardex).create(movimientosKardex);
        await manager.getRepository(Kardex).save(kardexEntities);
      }

      await manager.getRepository(TrasladoDetalle).save(traslado.detalles);
      return await manager.getRepository(Traslado).save(traslado);
    });
  }

  /**
   * Obtiene el Producto equivalente en la sede destino a partir de un productoId de referencia
   */
  private async obtenerProductoEquivalente(
    manager: EntityManager,
    productoIdReferencia: number,
    sedeDestinoId: number,
  ): Promise<Producto> {
    const productoOrigen = await manager.getRepository(Producto).findOne({
      where: { id: productoIdReferencia },
    });

    if (!productoOrigen) {
      throw new NotFoundException({
        message: `Producto de referencia (ID ${productoIdReferencia}) no encontrado`,
      });
    }

    let productoDestino: Producto | null = null;

    if (productoOrigen.monturaId) {
      productoDestino = await manager.getRepository(Producto).findOne({
        where: { sedeId: sedeDestinoId, monturaId: productoOrigen.monturaId },
        lock: { mode: 'pessimistic_write' },
      });
    } else if (productoOrigen.accesorioId) {
      productoDestino = await manager.getRepository(Producto).findOne({
        where: { sedeId: sedeDestinoId, accesorioId: productoOrigen.accesorioId },
        lock: { mode: 'pessimistic_write' },
      });
    } else {
      productoDestino = await manager.getRepository(Producto).findOne({
        where: {
          sedeId: sedeDestinoId,
          nombre: productoOrigen.nombre,
          tipo: productoOrigen.tipo,
        },
        lock: { mode: 'pessimistic_write' },
      });
    }

    if (!productoDestino) {
      throw new NotFoundException({
        message: `El producto "${productoOrigen.nombre}" no existe en la sede ID ${sedeDestinoId}.`,
      });
    }

    return productoDestino;
  }

  /**
   * Obtiene el Stock equivalente (Lente) en la sede destino a partir de un stockId de referencia
   */
  private async obtenerStockEquivalente(
    manager: EntityManager,
    stockIdReferencia: number,
    sedeDestinoId: number,
  ): Promise<Stock> {
    // 1.- Encuentro el stock en la sede origen
    const stockOrigen = await manager.getRepository(Stock).findOne({
      where: { id: stockIdReferencia },
      relations: ['lente'],
    });

    if (!stockOrigen) {
      throw new NotFoundException({
        message: `Stock de referencia (ID ${stockIdReferencia}) no encontrado`,
      });
    }

    // 2.- Busco el stock en la sede destino con los mismos parámetros
    const stockDestino = await manager.getRepository(Stock).findOne({
      where: {
        sedeId: sedeDestinoId,
        lenteId: stockOrigen.lenteId,
        matrix: stockOrigen.matrix,
        row: stockOrigen.row,
        col: stockOrigen.col,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!stockDestino) {
      throw new NotFoundException({
        message: `El registro de stock para el lente de referencia no existe en la sede ID ${sedeDestinoId}.`,
      });
    }

    stockDestino.lente = stockOrigen.lente;
    return stockDestino;
  }

  async recibirMercaderia(dto: RecibirMercaderiaDto): Promise<Traslado> {
    const traslado = await this.trasladoRepository.findOne({
      where: { id: dto.trasladoId },
      relations: ['detalles'],
    });

    if (!traslado) {
      throw new NotFoundException({
        message: `Traslado con ID ${dto.trasladoId} no encontrado`,
      });
    }

    if (traslado.estado !== EstadoTraslado.ENVIADO) {
      throw new BadRequestException({
        message: `El traslado se encuentra en estado ${traslado.estado}. Solo se puede recibir un traslado en estado ENVIADO.`,
      });
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Actualizar estado
      traslado.estado = EstadoTraslado.TRASLADADO;

      // 2. Incrementar stock en Sede Solicitante (Destino) y guardar cantidadRecibida
      for (const itemDto of dto.detalles) {
        const detalle = traslado.detalles.find((d) => d.id === itemDto.detalleId);
        if (!detalle) {
          throw new NotFoundException({
            message: `Detalle con ID ${itemDto.detalleId} no pertenece al traslado`,
          });
        }

        detalle.cantidadRecibida = itemDto.cantidadRecibida;

        if (itemDto.cantidadRecibida > 0) {
          await this.incrementarStockSolicitante(
            manager,
            traslado.sedeSolicitanteId,
            detalle,
            itemDto.cantidadRecibida,
          );
        }
      }

      // Guardar todos los detalles en batch
      await manager.getRepository(TrasladoDetalle).save(traslado.detalles);

      return await manager.getRepository(Traslado).save(traslado);
    });
  }

  /**
   * Incrementar stock en Sede Solicitante y registrar en Kardex
   */
  private async incrementarStockSolicitante(
    manager: EntityManager,
    sedeSolicitanteId: number,
    detalle: TrasladoDetalle,
    cantidadARecibir: number,
  ): Promise<void> {
    if (
      detalle.tipoProducto === TipoProducto.MONTURA ||
      detalle.tipoProducto === TipoProducto.ACCESORIO
    ) {
      const productoSolicitante = await this.obtenerProductoEquivalente(
        manager,
        detalle.productoId!,
        sedeSolicitanteId,
      );
      const cantidadAnterior = productoSolicitante.cantidad;
      productoSolicitante.cantidad += cantidadARecibir;
      await manager.getRepository(Producto).save(productoSolicitante);

      // Kardex: Registro de movimiento
      await this.kardexService.registrarMovimiento(manager, {
        sedeId: sedeSolicitanteId,
        tipoProducto: detalle.tipoProducto,
        productoId: productoSolicitante.id,
        origenEvento: OrigenEventoKardex.TRASLADO_RECIBIDO,
        cantidadAnterior,
        cantidadMovimiento: cantidadARecibir,
      });
    } else {
      const stockSolicitante = await this.obtenerStockEquivalente(
        manager,
        detalle.stockId!,
        sedeSolicitanteId,
      );
      const cantidadAnterior = stockSolicitante.cantidad;
      stockSolicitante.cantidad += cantidadARecibir;
      await manager.getRepository(Stock).save(stockSolicitante);

      // Kardex: Registro de movimiento
      await this.kardexService.registrarMovimiento(manager, {
        sedeId: sedeSolicitanteId,
        tipoProducto: TipoProducto.LENTE,
        stockId: stockSolicitante.id,
        origenEvento: OrigenEventoKardex.TRASLADO_RECIBIDO,
        cantidadAnterior,
        cantidadMovimiento: cantidadARecibir,
      });
    }
  }

  async obtenerTodos(query: {
    sedeProveedoraId?: number;
    sedeSolicitanteId?: number;
    estado?: EstadoTraslado;
  }): Promise<Traslado[]> {
    const qb = this.trasladoRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.sedeProveedora', 'sedeProveedora')
      .leftJoinAndSelect('t.sedeSolicitante', 'sedeSolicitante')
      .leftJoinAndSelect('t.usuarioSolicitante', 'usuarioSolicitante')
      .leftJoinAndSelect('t.detalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .leftJoinAndSelect('producto.montura', 'montura')
      .leftJoinAndSelect('producto.accesorio', 'accesorio')
      .leftJoinAndSelect('detalles.stock', 'stock')
      .leftJoinAndSelect('stock.lente', 'lente')
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('stock.matrix', 'ASC')
      .addOrderBy('stock.orden', 'ASC');

    if (query.sedeProveedoraId) {
      qb.andWhere('t.sedeProveedoraId = :sedeProveedoraId', {
        sedeProveedoraId: query.sedeProveedoraId,
      });
    }

    if (query.sedeSolicitanteId) {
      qb.andWhere('t.sedeSolicitanteId = :sedeSolicitanteId', {
        sedeSolicitanteId: query.sedeSolicitanteId,
      });
    }

    if (query.estado) {
      qb.andWhere('t.estado = :estado', { estado: query.estado });
    }

    return await qb.getMany();
  }

  async eliminarTraslado(id: number) {
    const traslado = await this.trasladoRepository.findOne({
      where: { id },
    });

    if (!traslado) {
      throw new NotFoundException({
        message: `Traslado con ID ${id} no encontrado`,
      });
    }

    if (traslado.estado !== EstadoTraslado.SOLICITADO) {
      throw new BadRequestException({
        message: 'Solo se pueden eliminar traslados en estado SOLICITADO',
      });
    }

    await this.trasladoRepository.remove(traslado);

    return {
      message: `Solicitud de traslado #${id} eliminada correctamente`,
      id,
    };
  }
}

