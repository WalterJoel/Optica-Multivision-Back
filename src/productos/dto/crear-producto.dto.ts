import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { TipoProducto } from '../../common/constants';

export class CrearProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsEnum(TipoProducto)
  tipo: TipoProducto;
}
