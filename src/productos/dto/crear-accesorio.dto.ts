import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoProducto } from '../../common/constants';

export class CrearAccesorioDto {
  @IsInt()
  @Type(() => Number)
  productoId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  atributo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imagenUrl?: string;

  @IsEnum(TipoProducto)
  tipo: TipoProducto;
}
