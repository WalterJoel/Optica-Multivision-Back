import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { TipoProducto } from 'src/common/constants';

export class CrearDescuentoDto {
  @IsNumber()
  @IsPositive()
  clienteId: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  productoId?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  lenteId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipoProducto: TipoProducto;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  serie?: number; // opcional, solo necesario si tipoProducto = 'LENTE'

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  montoDescuento: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean = true;
}
