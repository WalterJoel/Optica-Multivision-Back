import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import { TipoProducto } from 'src/common/constants';

export class CrearTrasladoDetalleDto {
  @IsEnum(TipoProducto)
  @IsNotEmpty()
  tipoProducto: TipoProducto;

  @IsOptional()
  @IsInt()
  @IsPositive()
  productoId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  stockId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  cantidadSolicitada?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  cantidad?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
