import { IsInt } from 'class-validator';

// ✅ DTO simplificado para crear seguimiento de pedido
export class CrearSeguimientoPedidoDto {
  @IsInt()
  ventaId: number;
}
