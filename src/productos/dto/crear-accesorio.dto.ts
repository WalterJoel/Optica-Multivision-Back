import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  IsNumber,
  IsBoolean,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClasificacionAccesorios, TipoProducto } from '../../common/constants';
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

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  sedeId: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  ubicacion?: string;

  @IsOptional()
  @IsEnum(ClasificacionAccesorios)
  clasificacion?: ClasificacionAccesorios;

  @IsOptional()
  @IsString()
  imagenUrl?: string;


}

export class CrearAccesorioDto extends OmitType(DatosParaCrearAccesorioDto, [
  'cantidad', 'ubicacion'
] as const) {
  @IsNumber()
  productoId: number;
}

export class CrearAccesorioExcelDto extends OmitType(DatosParaCrearAccesorioDto, [
  'cantidad', 'ubicacion', 'atributo', 'sedeId'
] as const) { }


