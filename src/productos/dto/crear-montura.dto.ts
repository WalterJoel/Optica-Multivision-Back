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

export class CrearMonturaDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  codigo?: string; //Codigo que maneja el dueño, se puede repetir

  @IsString()
  @IsOptional()
  @MaxLength(50)
  codigoMontura?: string; //Codigo Montura que maneja el dueño, se puede repetir no es unico

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  precioCompra?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  precioVenta?: number;

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
  medida: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsEnum(FormaFacial)
  formaFacial?: FormaFacial;

  @IsEnum(SexoMontura)
  @IsOptional()
  sexo?: SexoMontura;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imagenUrl?: string;
}
