import { IsNotEmpty, IsNumber, IsPositive, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class BuscarVentasDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  sedeId: number;

  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsDateString()
  @IsNotEmpty()
  fechaFin: string;
}
