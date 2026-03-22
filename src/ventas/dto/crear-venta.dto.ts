import {
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TipoProducto,
  MetodoPago,
  EstadoPago,
  TipoVenta,
} from 'src/common/constants';

// ✅ DTO PARA PRODUCTOS DE LA VENTA

export class VentaProductoDto {
  @IsInt()
  productoId: number;

  @IsEnum(TipoProducto)
  tipoProducto: TipoProducto;

  @IsNumber()
  precioUnitario: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsNumber()
  subtotal: number; // Viene calculado desde el front

  @IsOptional()
  @IsNumber()
  descuento?: number; // snapshot del descuento

  // Para lentes
  @IsOptional()
  @IsInt()
  stockId?: number;

  @IsOptional()
  @IsNumber()
  esf?: number;

  @IsOptional()
  @IsNumber()
  cyl?: number;

  // Para monturas y accesorios
  @IsOptional()
  @IsInt()
  stockProductoId?: number;
}

// ✅ DTO PARA LA CREACION DE LA VENTA
export class CrearVentaDto {
  @IsInt()
  sedeId: number;

  @IsInt()
  userId: number;

  @IsOptional()
  @IsString()
  responsableVenta?: string;

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsEnum(TipoVenta)
  tipoVenta: TipoVenta;

  @IsOptional()
  @IsEnum(EstadoPago)
  estadoPago?: EstadoPago;

  @IsOptional()
  montaje?: boolean;

  @IsOptional()
  @IsInt()
  nroCuotas?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  tipoComprobante?: string;

  @IsOptional()
  @IsString()
  nroComprobante?: string;

  @IsOptional()
  @IsInt()
  kitId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VentaProductoDto)
  productos: VentaProductoDto[];

  // Totales vienen del front
  @IsNumber()
  total: number;

  @IsNumber()
  montoPagado: number;

  @IsNumber()
  deuda: number;
}
