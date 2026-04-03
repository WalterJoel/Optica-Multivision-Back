import { IsNumber, IsArray, ValidateNested, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStockProductoDto {
  @IsNumber()
  @IsInt()
  stockId: number;

  @IsNumber()
  @IsInt()
  @Min(0, { message: 'La cantidad de stock no puede ser inferior a 0' })
  cantidad: number;
}

/**
 * ✅ Recibe una lista de objetos { stockId, cantidad } para ejecutar
 *     una actualización atómica en la base de datos.
 */
export class ActualizarStockProductosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateStockProductoDto)
  items: UpdateStockProductoDto[];
}
