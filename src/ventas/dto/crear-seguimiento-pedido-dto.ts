import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

// ✅ DTO para la creación e inicialización del seguimiento de un pedido
export class CrearSeguimientoPedidoDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  ventaId: number;
}
