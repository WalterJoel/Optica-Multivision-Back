import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { DescuentosService } from './descuentos.service';
import { CrearDescuentoDto } from './dto/create-descuento.dto';
import { UpdateDescuentoDto } from './dto/update-descuento.dto';
import { ObtenerDescuentosDto } from './dto/obtener-descuentos.dto';
import { AllowedRoles } from '../auth/roles.decorator';
import { Roles } from '../common/constants';

@Controller('descuentos')
export class DescuentosController {
  constructor(private readonly descuentosService: DescuentosService) { }

  @Post('crearDescuento')
  @AllowedRoles(Roles.ADMIN)
  create(@Body() createDescuentoDto: CrearDescuentoDto) {
    return this.descuentosService.create(createDescuentoDto);
  }

  @Post('obtenerDescuentos')
  obtenerDescuentos(@Body() obtenerDescuentosDto: ObtenerDescuentosDto) {
    return this.descuentosService.obtenerDescuentos(obtenerDescuentosDto);
  }

  @Get()
  findAll(@Query('sedeId') sedeId: string) {
    if (!sedeId) {
      throw new BadRequestException('El parámetro sedeId es obligatorio');
    }
    return this.descuentosService.findAll(+sedeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.descuentosService.findOne(+id);
  }

  @Patch(':id')
  @AllowedRoles(Roles.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDescuentoDto: UpdateDescuentoDto,
  ) {
    return this.descuentosService.update(+id, updateDescuentoDto);
  }

  @Delete(':id')
  @AllowedRoles(Roles.ADMIN)
  remove(@Param('id') id: string) {
    return this.descuentosService.remove(+id);
  }
}
