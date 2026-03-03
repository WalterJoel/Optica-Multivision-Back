import { PartialType } from '@nestjs/mapped-types';
import { CrearKitDto } from './crear-kit.dto';

export class ActualizarKitDto extends PartialType(CrearKitDto) {}
