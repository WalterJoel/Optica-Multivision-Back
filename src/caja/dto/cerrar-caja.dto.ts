import { IsNumber } from 'class-validator';

export class CerrarCajaDto {
  @IsNumber()
  cajaId: number;
  @IsNumber()
  saldoFinal: number;
}
