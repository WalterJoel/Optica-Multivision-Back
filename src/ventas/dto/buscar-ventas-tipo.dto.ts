import { IsEnum, IsNotEmpty } from 'class-validator';
import { BuscarVentasDto } from './buscar-ventas.dto';
import { TipoProducto } from '../../common/constants';

export class BuscarVentasPorTipoDto extends BuscarVentasDto {
  @IsEnum(TipoProducto)
  @IsNotEmpty()
  tipo: TipoProducto;
}
