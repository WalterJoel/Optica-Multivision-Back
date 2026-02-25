import { PartialType } from '@nestjs/mapped-types';
import { CrearSedeDto } from './crear-sede.dto';

export class UpdateSedeDto extends PartialType(CrearSedeDto) {}
