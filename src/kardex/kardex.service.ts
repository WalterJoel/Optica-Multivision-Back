import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Kardex } from './entities/kardex.entity';
import { RegistrarKardexDto } from './dto/registrar-kardex.dto';
import { QueryKardexDto } from './dto/query-kardex.dto';

@Injectable()
export class KardexService {
  constructor(
    @InjectRepository(Kardex)
    private readonly kardexRepository: Repository<Kardex>,
  ) { }

  /**
   * Método centralizado para registrar cualquier movimiento en el Kardex.
   * Recibe el EntityManager para ser ejecutado dentro de la transacción del proceso de negocio.
   */
  async registrarMovimiento(
    manager: EntityManager,
    dto: RegistrarKardexDto,
  ): Promise<Kardex> {
    const cantidadAnterior = Number(dto.cantidadAnterior) || 0;
    const cantidadMovimiento = Number(dto.cantidadMovimiento) || 0;
    const cantidadFinal = cantidadAnterior + cantidadMovimiento;

    const repo = manager.getRepository(Kardex);
    const registro = repo.create({
      sedeId: dto.sedeId,
      tipoProducto: dto.tipoProducto,
      productoId: dto.productoId || null,
      stockId: dto.stockId || null,
      origenEvento: dto.origenEvento,
      cantidadAnterior,
      cantidadMovimiento,
      cantidadFinal,
    });

    return await repo.save(registro);
  }

  /**
   * Obtiene el historial de movimientos de Kardex con filtros y paginación.
   */
  async obtenerHistorial(query: QueryKardexDto) {
    const { page = 1, limit = 20, ...filtros } = query;
    const skip = (page - 1) * limit;

    const qb = this.kardexRepository
      .createQueryBuilder('k')
      .leftJoinAndSelect('k.sede', 'sede')
      .leftJoinAndSelect('k.producto', 'producto')
      .leftJoinAndSelect('producto.montura', 'montura')
      .leftJoinAndSelect('producto.accesorio', 'accesorio')
      .leftJoinAndSelect('k.stock', 'stock')
      .leftJoinAndSelect('stock.lente', 'lente')
      .orderBy('k.id', 'DESC')
      .skip(skip)
      .take(limit);

    Object.entries(filtros).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        qb.andWhere(`k.${key} = :${key}`, { [key]: val });
      }
    });

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
