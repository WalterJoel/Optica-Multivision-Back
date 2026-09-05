import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Traslado } from './entities/traslado.entity';
import { TrasladoDetalle } from './entities/trasladoDetalle.entity';
import { CrearTrasladoDto } from './dto/crear-traslado.dto';
import { EnviarMercaderiaDto } from './dto/enviar-mercaderia.dto';
import { RecibirMercaderiaDto } from './dto/recibir-mercaderia.dto';
import { EstadoTraslado, TipoProducto } from 'src/common/constants';
import { Producto, Stock } from 'src/productos/entities';
import { KardexService } from 'src/kardex/kardex.service';
import { OrigenEventoKardex } from 'src/kardex/entities/kardex.entity';

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
      // 1. Actualizar estado a ENVIADO
      traslado.estado = EstadoTraslado.ENVIADO;

      // 2. Validar stock disponible, descontar inventario en Sede Proveedora y actualizar cantidadEnviada
      for (const item of dto.detalles) {
        const detalle = traslado.detalles.find((d) => d.id === item.detalleId);
        if (!detalle) {
          throw new NotFoundException({
            message: `Detalle con ID ${item.detalleId} no pertenece al traslado`,
          });
        }

        // Validar stock, descontar e inventariar Kardex en 1 sola consulta
        if (item.cantidadEnviada > 0) {
          await this.descontarStockProveedora(
            manager,
            traslado.sedeProveedoraId,
            detalle,
            item.cantidadEnviada,
          );
        }

        detalle.cantidadEnviada = item.cantidadEnviada;
      }

      // Guardar detalles en batch
      await manager.getRepository(TrasladoDetalle).save(traslado.detalles);

      // 3. Guardar cambios del traslado
      return await manager.getRepository(Traslado).save(traslado);
    });
  }

  /**
   * Valida stock disponible en Sede Proveedora, lo descuenta y registra el movimiento en Kardex en 1 sola paso.
   */
  private async descontarStockProveedora(
    manager: EntityManager,
    sedeProveedoraId: number,
    detalle: TrasladoDetalle,
    cantidadAEnviar: number,
  ): Promise<void> {
    if (
      detalle.tipoProducto === TipoProducto.MONTURA ||
      detalle.tipoProducto === TipoProducto.ACCESORIO
    ) {
      const productoProveedora = await this.obtenerProductoEquivalente(
        manager,
        detalle.productoId!,
        sedeProveedoraId,
      );

      if (productoProveedora.cantidad < cantidadAEnviar) {
        throw new BadRequestException({
          message: `Stock insuficiente en la sede proveedora para "${productoProveedora.nombre}". Disponible: ${productoProveedora.cantidad}, Requerido a enviar: ${cantidadAEnviar}`,
        });
      }

      const cantidadAnterior = productoProveedora.cantidad;
      productoProveedora.cantidad -= cantidadAEnviar;
      await manager.getRepository(Producto).save(productoProveedora);

      // Kardex: Registro de movimiento
      await this.kardexService.registrarMovimiento(manager, {
        sedeId: sedeProveedoraId,
        tipoProducto: detalle.tipoProducto,
        productoId: productoProveedora.id,
        origenEvento: OrigenEventoKardex.TRASLADO_ENVIADO,
        cantidadAnterior,
        cantidadMovimiento: -cantidadAEnviar,
      });
    } else {
      const stockProveedora = await this.obtenerStockEquivalente(
        manager,
        detalle.stockId!,
        sedeProveedoraId,
      );

      if (stockProveedora.cantidad < cantidadAEnviar) {
        throw new BadRequestException({
          message: `Stock insuficiente para ${stockProveedora.lente.marca} ${stockProveedora.lente.material} (ESF: ${stockProveedora.esf}, CYL: ${stockProveedora.cyl}). Disponible: ${stockProveedora.cantidad}, Requerido: ${cantidadAEnviar}`,
        });
      }

      const cantidadAnterior = stockProveedora.cantidad;
      stockProveedora.cantidad -= cantidadAEnviar;
      await manager.getRepository(Stock).save(stockProveedora);

      // Kardex: Registro de movimiento
      await this.kardexService.registrarMovimiento(manager, {
        sedeId: sedeProveedoraId,
        tipoProducto: TipoProducto.LENTE,
        stockId: stockProveedora.id,
        origenEvento: OrigenEventoKardex.TRASLADO_ENVIADO,
        cantidadAnterior,
        cantidadMovimiento: -cantidadAEnviar,
      });
    }
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

