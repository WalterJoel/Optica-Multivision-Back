import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsEnum,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClasificacionLentes, PrioridadLentes, TipoProducto } from '../../common/constants';

export class CrearLenteDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  kitId?: number;

  @IsString()
  @MaxLength(100)
  marca: string;

  @IsString()
  @MaxLength(100)
  material: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precio_serie1: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precio_serie2: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precio_serie3: number;

  @IsEnum(ClasificacionLentes)
  clasificacion: ClasificacionLentes;

  @IsOptional()
  @IsEnum(PrioridadLentes)
  @Type(() => Number)
  prioridad?: PrioridadLentes;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  imagenUrl?: string;

  @IsEnum(TipoProducto)
  tipo: TipoProducto;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  sedeId: number;
}
