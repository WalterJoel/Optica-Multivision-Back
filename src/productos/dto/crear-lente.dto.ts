import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  MaxLength,
  IsEnum,
} from 'class-validator';

export enum TipoProducto {
  LENTE = 'LENTE',
  MONTURA = 'MONTURA',
  ACCESORIO = 'ACCESORIO',
}

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
  tipo: TipoProducto; // LENTE | MONTURA | ACCESORIO
}
