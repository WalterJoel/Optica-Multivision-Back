import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { TipoProducto } from '../../common/constants';

export class CrearLenteDto {
  @IsString()
  @MaxLength(100)
  marca: string;

  @IsString()
  @MaxLength(100)
  material: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  imagenUrl?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio_serie1: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio_serie2: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio_serie3: number;

  @IsEnum(TipoProducto)
  tipo: TipoProducto;
}
