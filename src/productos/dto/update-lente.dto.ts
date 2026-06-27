import { PartialType } from '@nestjs/mapped-types';
import { CrearLenteDto } from './crear-lente.dto';
import { IsBoolean, IsOptional, IsNumber, IsPositive, IsInt } from 'class-validator';

export class UpdateLenteDto extends PartialType(CrearLenteDto) {
  @IsInt()
  @IsPositive()
  sedeId: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio_serie1?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio_serie2?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio_serie3?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
