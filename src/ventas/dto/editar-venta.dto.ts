import { IsOptional, IsString, IsInt, IsBoolean } from 'class-validator';

export class EditarVentaDto {
  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsBoolean()
  montaje?: boolean;

  @IsOptional()
  @IsInt()
  diasCompromisoPago?: number;

  @IsOptional()
  @IsInt()
  clienteId?: number;

  @IsOptional()
  @IsString()
  metodoPago?: string;

  @IsOptional()
  @IsString()
  tipoComprobante?: string;

  @IsOptional()
  @IsString()
  nroComprobante?: string;
}
