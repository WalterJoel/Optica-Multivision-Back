import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { TipoProducto } from '../../common/constants';
import { Type } from 'class-transformer';

export class CrearProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsEnum(TipoProducto)
  tipo: TipoProducto;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  cantidad: number;

  @IsNumber()
  @Type(() => Number)
  sedeId: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  ubicacion?: string;

}
