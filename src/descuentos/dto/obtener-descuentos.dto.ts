import {
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsPositive,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductoCylDto {
  @IsNumber()
  @IsPositive()
  productoId: number;

  @IsBoolean()
  esLente: boolean; // Solo asi consideramos el CYL

  @IsOptional()
  @IsNumber()
  cyl?: number | null; // si es null es neutro ojo
}

export class ObtenerDescuentosDto {
  @IsNumber()
  @IsPositive()
  clienteId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoCylDto)
  productos: ProductoCylDto[];
}
