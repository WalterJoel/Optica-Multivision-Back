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
  productoId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipoProducto: TipoProducto;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  serie?: string; // opcional, solo necesario si tipoProducto = 'LENTE'

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  montoDescuento: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean = true;
}
