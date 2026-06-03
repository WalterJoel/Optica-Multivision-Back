import { PartialType } from '@nestjs/mapped-types';
import { CrearMovimientoCajaDto } from './crear-movimiento-caja.dto';

export class ActualizarMovimientoCajaDto extends PartialType(CrearMovimientoCajaDto) {}
