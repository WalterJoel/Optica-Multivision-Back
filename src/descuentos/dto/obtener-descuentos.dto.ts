import {
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsPositive,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoProducto } from 'src/common/constants';

class ProductoCylDto {
  @IsNumber()
  @IsPositive()
  cartItemId: number; // Identidad única del carrito

  @IsOptional()
  @IsNumber()
  @IsPositive()
  productoId?: number | null;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  lenteId?: number;


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

  @IsNumber()
  @IsPositive()
  sedeId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoCylDto)
  productos: ProductoCylDto[];
}
