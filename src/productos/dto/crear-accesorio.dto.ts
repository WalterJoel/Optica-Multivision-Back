import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoProducto } from '../../common/constants';

export class CrearAccesorioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  color: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Type(() => Number)
  precio: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  atributo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imagenUrl?: string;

  @IsOptional()
  @IsBoolean()
  basico?: boolean;

  @IsEnum(TipoProducto)
  tipo: TipoProducto;
}
