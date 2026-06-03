import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityManager } from 'typeorm';
import { CrearMovimientoCajaDto } from './dto/crear-movimiento-caja.dto';
import { ActualizarMovimientoCajaDto } from './dto/actualizar-movimiento-caja.dto';
import {
  MovimientoCaja,
  TipoMovimiento,
} from './entities/movimientoCaja.entity';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(MovimientoCaja)
    private readonly movimientoRepository: Repository<MovimientoCaja>,
  ) { }

  async registrarMovimiento(dto: CrearMovimientoCajaDto) {
    const { tipo, monto } = dto;

    if (monto <= 0) {
      throw new ConflictException({ message: 'El monto debe ser mayor a 0' });
    }

    const movimiento = this.movimientoRepository.create({
      ...dto,
    });

    await this.movimientoRepository.save(movimiento);

    return {
      message:
        tipo === TipoMovimiento.INGRESO
          ? 'Ingreso registrado correctamente'
          : 'Egreso registrado correctamente',

      data: movimiento,
    };
  }

  async registrarMovimientoTransaction(
    manager: EntityManager,
    dto: CrearMovimientoCajaDto,
  ) {
    const { tipo, monto } = dto;

    if (monto <= 0) {
      throw new ConflictException({ message: 'El monto debe ser mayor a 0' });
    }

    const movimiento = manager.getRepository(MovimientoCaja).create({
      ...dto,
    });

    await manager.getRepository(MovimientoCaja).save(movimiento);
    return {
      message:
        tipo === TipoMovimiento.INGRESO
          ? 'Ingreso registrado correctamente'
          : 'Egreso registrado correctamente',

      data: movimiento,
    };
  }
  async getMovimientos(sedeId: number) {
    return await this.movimientoRepository.find({
      where: {
        sedeId,
      },
      relations: ['venta', 'sede'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async actualizarMovimiento(id: number, dto: ActualizarMovimientoCajaDto) {
    const movimiento = await this.movimientoRepository.findOne({
      where: { id },
    });

    if (!movimiento) {
      throw new NotFoundException({ message: 'Movimiento de caja no encontrado' });
    }

    if (dto.monto !== undefined && dto.monto <= 0) {
      throw new ConflictException({ message: 'El monto debe ser mayor a 0' });
    }

    const updatedMovimiento = this.movimientoRepository.merge(movimiento, dto);
    await this.movimientoRepository.save(updatedMovimiento);

    return {
      message: 'Movimiento de caja actualizado correctamente',
      data: updatedMovimiento,
    };
  }
}
