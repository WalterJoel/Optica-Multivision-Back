import { IsNumber } from 'class-validator';

export class CrearCajaDto {
  @IsNumber()
  sedeId: number;

  @IsNumber()
  userId: number;

  @IsNumber()
  saldoInicial: number;
}
