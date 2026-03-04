import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoProducto, FormaFacial, SexoMontura } from '../../common/constants';

export class CrearMonturaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marca: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  material: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Type(() => Number)
  precio: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  medida: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  color: string;

  @IsEnum(FormaFacial)
  formaFacial: FormaFacial;

  @IsEnum(SexoMontura)
  sexo: SexoMontura;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imagenUrl?: string;

  @IsEnum(TipoProducto)
  tipo: TipoProducto;
}
