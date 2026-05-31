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
  diasCompromisoPago,
} from 'src/common/constants';

// ✅ DTO PARA PRODUCTOS DE LA VENTA

export class VentaProductoDto {
  @IsOptional()
  @IsInt()
  productoId?: number; //Solo para montura y accesorio

  @IsEnum(TipoProducto)
  tipoProducto: TipoProducto;

  @IsNumber()
  precioUnitario: number;

  @IsNumber()
  subtotal: number; // Precio unitario - descuento (Viene calculado del front)

  @IsOptional()
  @IsNumber()
  descuento?: number; // snapshot del descuento

  @IsInt()
  @Min(1)
  cantidad: number;

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

}

// ✅ DTO PARA LA CREACION DE LA VENTA
export class CrearVentaDto {
  @IsInt()
  sedeId: number;

  @IsInt()
  userId: number; //Responsable de la venta, usuario logueado

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsEnum(TipoVenta)
  tipoVenta: TipoVenta;

  @IsOptional()
  @IsEnum(EstadoPago)
  estadoPago?: EstadoPago;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  tipoComprobante?: string;

  @IsOptional()
  @IsString()
  nroComprobante?: string;


  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VentaProductoDto)
  productos: VentaProductoDto[];

  // TOTAL DE LA VENTA - viene del front
  @IsNumber()
  total: number;

  // Solo para credito
  @IsOptional()
  @IsEnum(diasCompromisoPago)
  diasCompromisoPago?: diasCompromisoPago;

  @IsOptional()
  montaje?: boolean;

  @IsOptional()
  @IsInt()
  nroCuotas?: number;

  @IsNumber()
  montoPagado: number;

  @IsNumber()
  deuda: number;
}
