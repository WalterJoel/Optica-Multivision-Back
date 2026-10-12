import { IsNumber, IsArray, ValidateNested, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStockProductoDto {
  @IsNumber()
  @IsInt()
  productoId: number;

  @IsNumber()
  @IsInt()
  @Min(0, { message: 'La cantidad no puede ser menor a 0' })
  cantidad: number;
}

// Lista de items { productoId, cantidad } para actualización por lote
export class ActualizarStockProductosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateStockProductoDto)
  items: UpdateStockProductoDto[];
}
