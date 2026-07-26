import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ItemRecibirMercaderiaDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  detalleId: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  cantidadRecibida: number;
}

export class RecibirMercaderiaDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  trasladoId: number;

  @ValidateNested({ each: true })
  @Type(() => ItemRecibirMercaderiaDto)
  @ArrayMinSize(1)
  @IsNotEmpty()
  detalles: ItemRecibirMercaderiaDto[];
}
