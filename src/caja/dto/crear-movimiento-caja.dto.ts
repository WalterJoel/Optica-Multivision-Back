import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { TipoMovimiento } from '../entities/movimientoCaja.entity';

export class CrearMovimientoCajaDto {
  @IsNumber()
  cajaId: number;

  @IsEnum(TipoMovimiento)
  tipo: TipoMovimiento;

  @IsNumber()
  monto: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  ventaId?: number;

  @IsOptional()
  @IsString()
  metodoPago?: string;
}
