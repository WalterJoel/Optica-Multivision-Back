import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Caja, EstadoCaja } from './entities/caja.entity';
import { CrearCajaDto } from './dto/crear-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CrearMovimientoCajaDto } from './dto/crear-movimiento-caja.dto';
import {
  MovimientoCaja,
  TipoMovimiento,
} from './entities/movimientoCaja.entity';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(Caja)
    private readonly cajaRepository: Repository<Caja>,

    @InjectRepository(MovimientoCaja)
    private readonly movimientoRepository: Repository<MovimientoCaja>,
  ) {}

  async create(crearCajaDto: CrearCajaDto) {
    const { sedeId } = crearCajaDto;

    // Valido Caja Abierta
    const { existe } = await this.validarCajaAbierta(sedeId);

    if (existe) {
      throw new ConflictException({
        message: 'Ya existe una caja abierta para esta sede',
        code: 'CAJA_ABIERTA',
      });
    }

    const caja = this.cajaRepository.create({
      ...crearCajaDto,
    });

    try {
      return await this.cajaRepository.save(caja);
    } catch (error) {
      throw new ConflictException({
        message: error + 'Ya existe una caja abierta para esta sede',
        code: 'CAJA_ABIERTA',
      });
    }
  }
  async cerrarCaja(cerrarCajaDto: CerrarCajaDto) {
    const { cajaId, saldoFinal } = cerrarCajaDto;

    const caja = await this.cajaRepository.findOne({
      where: { id: cajaId },
    });

    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }

    if (caja.estado === EstadoCaja.CERRADA) {
      throw new ConflictException('La caja ya está cerrada');
    }

    caja.estado = EstadoCaja.CERRADA;
    caja.fechaCierre = new Date();
    caja.saldoFinal = saldoFinal;

    await this.cajaRepository.save(caja);

    return {
      message: 'Caja cerrada correctamente',
    };
  }

  async validarCajaAbierta(sedeId: number) {
    const caja = await this.cajaRepository.findOne({
      where: {
        sedeId,
        estado: EstadoCaja.ABIERTA,
      },
    });

    return {
      existe: !!caja,
      caja: caja,
    };
  }

  // ┌───────────────────────────────────────────────┐
  // │  ✅  SECCIÓN MOVIMIENTO DE CAJA               │
  // └───────────────────────────────────────────────┘

  async registrarMovimiento(dto: CrearMovimientoCajaDto) {
    const { cajaId, tipo, monto } = dto;

    const caja = await this.cajaRepository.findOne({
      where: { id: cajaId },
    });

    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }

    if (caja.estado !== EstadoCaja.ABIERTA) {
      throw new ConflictException('La caja está cerrada');
    }

    if (monto <= 0) {
      throw new ConflictException('El monto debe ser mayor a 0');
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
    };
  }

  async getMovimientos(sedeId: number) {
    return await this.movimientoRepository.find({
      where: {
        caja: {
          sedeId: sedeId,
        },
      },
      relations: ['caja', 'usuario'],
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
