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
import { CambiarEstadoTrasladoDto } from './dto/cambiar-estado-traslado.dto';
import { EstadoTraslado, TipoProducto } from 'src/common/constants';
import { Producto, Stock } from 'src/productos/entities';

@Injectable()
export class TrasladosService {
  constructor(
    @InjectRepository(Traslado)
    private readonly trasladoRepository: Repository<Traslado>,
    @InjectRepository(TrasladoDetalle)
    private readonly trasladoDetalleRepository: Repository<TrasladoDetalle>,
    private readonly dataSource: DataSource,
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

        // Validar disponibilidad pesimista en la sede proveedora
        await this.validarStockDisponible(
          manager,
          traslado.sedeProveedoraId,
          detalle,
          item.cantidadEnviada,
        );

        // Descontar inventario de la sede proveedora
        if (item.cantidadEnviada > 0) {
          if (
            detalle.tipoProducto === TipoProducto.MONTURA ||
            detalle.tipoProducto === TipoProducto.ACCESORIO
          ) {
            const productoProveedora = await this.obtenerProductoEquivalente(
              manager,
              detalle.productoId!,
              traslado.sedeProveedoraId,
            );
            productoProveedora.cantidad -= item.cantidadEnviada;
            await manager.getRepository(Producto).save(productoProveedora);
          } else {
            const stockProveedora = await this.obtenerStockEquivalente(
              manager,
              detalle.stockId!,
              traslado.sedeProveedoraId,
            );
            stockProveedora.cantidad -= item.cantidadEnviada;
            await manager.getRepository(Stock).save(stockProveedora);
          }
        }

        detalle.cantidadEnviada = item.cantidadEnviada;
        await manager.getRepository(TrasladoDetalle).save(detalle);
      }

      // 3. Guardar cambios del traslado
      return await manager.getRepository(Traslado).save(traslado);
    });
  }

  /**
   * Método auxiliar para validar stock disponible con bloqueo pesimista
   */
  private async validarStockDisponible(
    manager: EntityManager,
    sedeProveedoraId: number,
    detalle: TrasladoDetalle,
    cantidadAEnviar: number,
  ): Promise<void> {
    if (cantidadAEnviar <= 0) return;

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
    } else {
      const stockProveedora = await this.obtenerStockEquivalente(
        manager,
        detalle.stockId!,
        sedeProveedoraId,
      );

      if (stockProveedora.cantidad < cantidadAEnviar) {
        throw new BadRequestException({
          message: `Stock insuficiente en la sede proveedora para el lente. Disponible: ${stockProveedora.cantidad}, Requerido a enviar: ${cantidadAEnviar}`,
        });
      }
    }
  }

  /**
   * Obtiene el Producto equivalente en la sede destino a partir de un productoId de referencia
   */
  private async obtenerProductoEquivalente(
    manager: EntityManager,
    productoIdReferencia: number,
    targetSedeId: number,
  ): Promise<Producto> {
    const prodRef = await manager.getRepository(Producto).findOne({
      where: { id: productoIdReferencia },
    });

    if (!prodRef) {
      throw new NotFoundException({
        message: `Producto de referencia (ID ${productoIdReferencia}) no encontrado`,
      });
    }

    if (prodRef.sedeId === targetSedeId) return prodRef;

    let productoTarget: Producto | null = null;

    if (prodRef.monturaId) {
      productoTarget = await manager.getRepository(Producto).findOne({
        where: { sedeId: targetSedeId, monturaId: prodRef.monturaId },
        lock: { mode: 'pessimistic_write' },
      });
    } else if (prodRef.accesorioId) {
      productoTarget = await manager.getRepository(Producto).findOne({
        where: { sedeId: targetSedeId, accesorioId: prodRef.accesorioId },
        lock: { mode: 'pessimistic_write' },
      });
    } else {
      productoTarget = await manager.getRepository(Producto).findOne({
        where: {
          sedeId: targetSedeId,
          nombre: prodRef.nombre,
          tipo: prodRef.tipo,
        },
        lock: { mode: 'pessimistic_write' },
      });
    }

    if (!productoTarget) {
      throw new NotFoundException({
        message: `El producto "${prodRef.nombre}" no existe en la sede ID ${targetSedeId}.`,
      });
    }

    return productoTarget;
  }

  /**
   * Obtiene el Stock equivalente (Lente) en la sede destino a partir de un stockId de referencia
   */
  private async obtenerStockEquivalente(
    manager: EntityManager,
    stockIdReferencia: number,
    targetSedeId: number,
  ): Promise<Stock> {
    const stockRef = await manager.getRepository(Stock).findOne({
      where: { id: stockIdReferencia },
    });

    if (!stockRef) {
      throw new NotFoundException({
        message: `Stock de referencia (ID ${stockIdReferencia}) no encontrado`,
      });
    }

    if (stockRef.sedeId === targetSedeId) return stockRef;

    const stockTarget = await manager.getRepository(Stock).findOne({
      where: {
        sedeId: targetSedeId,
        lenteId: stockRef.lenteId,
        matrix: stockRef.matrix,
        row: stockRef.row,
        col: stockRef.col,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!stockTarget) {
      throw new NotFoundException({
        message: `El registro de stock para el lente de referencia no existe en la sede ID ${targetSedeId}.`,
      });
    }

    return stockTarget;
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
        await manager.getRepository(TrasladoDetalle).save(detalle);

        if (itemDto.cantidadRecibida > 0) {
          if (
            detalle.tipoProducto === TipoProducto.MONTURA ||
            detalle.tipoProducto === TipoProducto.ACCESORIO
          ) {
            const productoSolicitante = await this.obtenerProductoEquivalente(
              manager,
              detalle.productoId!,
              traslado.sedeSolicitanteId,
            );
            productoSolicitante.cantidad += itemDto.cantidadRecibida;
            await manager.getRepository(Producto).save(productoSolicitante);
          } else {
            const stockSolicitante = await this.obtenerStockEquivalente(
              manager,
              detalle.stockId!,
              traslado.sedeSolicitanteId,
            );
            stockSolicitante.cantidad += itemDto.cantidadRecibida;
            await manager.getRepository(Stock).save(stockSolicitante);
          }
        }
      }

      return await manager.getRepository(Traslado).save(traslado);
    });
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
      .orderBy('t.createdAt', 'DESC');

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

  async cambiarEstado(
    id: number,
    dto: CambiarEstadoTrasladoDto,
  ): Promise<Traslado> {
    const traslado = await this.trasladoRepository.findOne({
      where: { id },
      relations: ['detalles'],
    });

    if (!traslado) {
      throw new NotFoundException({
        message: `Traslado con ID ${id} no encontrado`,
      });
    }

    traslado.estado = dto.estado;

    if (dto.detalles && dto.detalles.length > 0) {
      for (const detDto of dto.detalles) {
        const item = traslado.detalles.find((d) => d.id === detDto.detalleId);
        if (item) {
          if (detDto.cantidadEnviada !== undefined) {
            item.cantidadEnviada = detDto.cantidadEnviada;
          }
          if (detDto.cantidadRecibida !== undefined) {
            item.cantidadRecibida = detDto.cantidadRecibida;
          }
          if (detDto.observacion !== undefined) {
            item.observacion = detDto.observacion;
          }
          await this.trasladoDetalleRepository.save(item);
        }
      }
    }

    return await this.trasladoRepository.save(traslado);
  }
}
