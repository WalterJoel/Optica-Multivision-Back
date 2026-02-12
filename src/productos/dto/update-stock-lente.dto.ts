// stock/dto/update-stock-lente.dto.ts
import { IsInt, Min, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStockItemDto {
  @IsInt()
  id: number;

  @IsInt()
  @Min(0)
  cantidad: number;
}

export class UpdateStockLenteDto {
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpdateStockItemDto)
  items: UpdateStockItemDto[];
}
