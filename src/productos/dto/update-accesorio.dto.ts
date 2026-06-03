import { PartialType } from '@nestjs/mapped-types';
import { DatosParaCrearAccesorioDto } from './crear-accesorio.dto';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAccesorioDto extends PartialType(DatosParaCrearAccesorioDto) {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  productoId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}