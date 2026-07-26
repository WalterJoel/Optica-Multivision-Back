import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoProducto } from 'src/common/constants';

export class ItemEnviarMercaderiaDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  detalleId: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  cantidadEnviada: number;

}

export class EnviarMercaderiaDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  trasladoId: number;


  @ValidateNested({ each: true })
  @Type(() => ItemEnviarMercaderiaDto)
  @ArrayMinSize(1)
  @IsNotEmpty()
  detalles: ItemEnviarMercaderiaDto[];
}
