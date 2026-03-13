import { PartialType } from '@nestjs/mapped-types';
import { CrearMonturaDto } from './crear-montura.dto';

export class UpdateMonturaDto extends PartialType(CrearMonturaDto) {}