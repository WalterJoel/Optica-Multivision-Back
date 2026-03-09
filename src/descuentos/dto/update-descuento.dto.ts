import { PartialType } from '@nestjs/mapped-types';
//cambiamos crear por crete 
import { CrearDescuentoDto } from './create-descuento.dto';
//cambiamos crear por crete 
export class UpdateDescuentoDto extends PartialType(CrearDescuentoDto) {}
