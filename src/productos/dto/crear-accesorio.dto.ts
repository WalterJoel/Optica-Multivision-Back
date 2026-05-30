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
import { OmitType } from '@nestjs/mapped-types';

export class DatosParaCrearAccesorioDto {
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
  codigoAccesorio: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  precioCompra: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  precioVenta: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  atributo?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  cantidad: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  ubicacion?: string;

  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsNumber()
  @Type(() => Number)
  sedeId: number;

}

export class CrearAccesorioDto extends OmitType(DatosParaCrearAccesorioDto, [
  'cantidad', 'ubicacion', 'sedeId'
] as const) {
  @IsNumber()
  productoId: number;
}
