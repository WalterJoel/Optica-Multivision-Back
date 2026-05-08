import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMovimiento } from '../entities/movimientoCaja.entity';
import { MetodoPago } from 'src/common/constants';

export class CrearMovimientoCajaDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  sedeId: number;

  @IsEnum(TipoMovimiento)
  tipo: TipoMovimiento;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  // Opcional si el movimiento proviene de una venta
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ventaId?: number;

  // EFECTIVO | YAPE | PLIN | TARJETA
  @IsOptional()
  @IsString()
  metodoPago?: MetodoPago;
}
