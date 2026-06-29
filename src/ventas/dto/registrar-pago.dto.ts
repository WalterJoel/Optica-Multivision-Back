import { IsNumber, IsString, Min } from 'class-validator';

export class RegistrarPagoDto {
  @IsNumber()
  @Min(0.01)
  montoPagado: number;

  @IsString()
  metodoPago: string;

  @IsNumber()
  sedeId: number;
}
