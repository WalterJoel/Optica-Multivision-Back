import { PartialType } from '@nestjs/mapped-types';
import { CrearLenteDto } from './crear-lente.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateLenteDto extends PartialType(CrearLenteDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
