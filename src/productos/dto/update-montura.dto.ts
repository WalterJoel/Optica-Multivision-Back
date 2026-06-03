import { PartialType } from '@nestjs/mapped-types';
import { DatosParaCrearMonturaDto } from './crear-montura.dto';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMonturaDto extends PartialType(DatosParaCrearMonturaDto) {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  productoId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}