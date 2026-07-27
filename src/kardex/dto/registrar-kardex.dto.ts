import { TipoProducto } from 'src/common/constants';
import { OrigenEventoKardex } from '../entities/kardex.entity';

export interface RegistrarKardexDto {
  sedeId: number;
  tipoProducto: TipoProducto;
  productoId?: number | null;
  stockId?: number | null;
  origenEvento: OrigenEventoKardex;
  cantidadAnterior: number;
  cantidadMovimiento: number;
}
