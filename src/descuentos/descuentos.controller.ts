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

@Controller('descuentos')
export class DescuentosController {
  constructor(private readonly descuentosService: DescuentosService) { }

  @Post('crearDescuento')
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
  update(
    @Param('id') id: string,
    @Body() updateDescuentoDto: UpdateDescuentoDto,
  ) {
    return this.descuentosService.update(+id, updateDescuentoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.descuentosService.remove(+id);
  }
}
