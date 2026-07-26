import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoTraslado } from 'src/common/constants';

export class ActualizarDetalleCantidadDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  detalleId: number;

  @IsOptional()
  @IsInt()
  cantidadEnviada?: number;

  @IsOptional()
  @IsInt()
  cantidadRecibida?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class CambiarEstadoTrasladoDto {
  @IsEnum(EstadoTraslado)
  @IsNotEmpty()
  estado: EstadoTraslado;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ActualizarDetalleCantidadDto)
  detalles?: ActualizarDetalleCantidadDto[];
}
