import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AccesorioCantidadDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  accesorioId: number;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  cantidad: number;
}

export class CrearKitDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  precio: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccesorioCantidadDto)
  accesorios?: AccesorioCantidadDto[];
}
