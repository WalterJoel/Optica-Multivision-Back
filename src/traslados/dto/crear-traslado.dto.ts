import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrigenSolicitudTraslado } from 'src/common/constants';
import { CrearTrasladoDetalleDto } from './crear-traslado-detalle.dto';

export class CrearTrasladoDto {
  @IsEnum(OrigenSolicitudTraslado)
  @IsNotEmpty()
  origenSolicitud: OrigenSolicitudTraslado;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  sedeProveedoraId: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  sedeSolicitanteId: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  usuarioSolicitanteId: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @ValidateNested({ each: true })
  @Type(() => CrearTrasladoDetalleDto)
  @ArrayMinSize(1)
  @IsNotEmpty()
  detalles: CrearTrasladoDetalleDto[];
}
