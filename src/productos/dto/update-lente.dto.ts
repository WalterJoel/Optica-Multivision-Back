import { PartialType } from '@nestjs/mapped-types';
import { CrearLenteDto } from './crear-lente.dto';
import { IsBoolean, IsOptional, IsNumber, Min, IsInt } from 'class-validator';

export class UpdateLenteDto extends PartialType(CrearLenteDto) {
  @IsInt()
  @Min(1)
  sedeId: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_serie1?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_serie2?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_serie3?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
