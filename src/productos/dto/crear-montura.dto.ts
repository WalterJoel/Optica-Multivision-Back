import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FormaFacial, SexoMontura } from '../../common/constants';
import { OmitType } from '@nestjs/mapped-types';

export class DatosParaCrearMonturaDto {
  @IsString()
  codigo: string; //Codigo que maneja el dueño, se puede repetir

  @IsString()
  codigoMontura: string; //Codigo Montura que maneja el dueño, se puede repetir no es unico

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  precioCompra: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  precioVenta: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marca: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  material: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  talla: string;

  @IsString()
  @MaxLength(50)
  color: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  cantidad: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  ubicacion?: string;

  @IsEnum(FormaFacial)
  formaFacial: FormaFacial;

  @IsEnum(SexoMontura)
  sexo: SexoMontura;

  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsNumber()
  @Type(() => Number)
  sedeId: number;

}

export class CrearMonturaExcelDto extends OmitType(DatosParaCrearMonturaDto, [
  'cantidad', 'ubicacion', 'sedeId', 'formaFacial', 'sexo'
] as const) {
  // @IsNumber()
  // productoId: number;
}
