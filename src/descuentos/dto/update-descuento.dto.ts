import { PartialType } from '@nestjs/mapped-types';
import { CrearDescuentoDto } from './create-descuento.dto';

export class UpdateDescuentoDto extends PartialType(CrearDescuentoDto) {}
