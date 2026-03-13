import { PartialType } from '@nestjs/mapped-types';
import { CrearAccesorioDto } from './crear-accesorio.dto';

export class UpdateAccesorioDto extends PartialType(CrearAccesorioDto) {}