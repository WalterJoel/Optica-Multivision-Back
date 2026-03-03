import { PartialType } from '@nestjs/mapped-types';
import { CrearClienteDto } from './crear-cliente.dto';

export class UpdateClienteDto extends PartialType(CrearClienteDto) {}