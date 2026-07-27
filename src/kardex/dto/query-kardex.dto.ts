import { IsOptional, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoProducto } from 'src/common/constants';

export class QueryKardexDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sedeId?: number;

  @IsOptional()
  @IsEnum(TipoProducto)
  tipoProducto?: TipoProducto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stockId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 20;
}
