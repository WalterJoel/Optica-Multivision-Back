import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DescuentosService } from './descuentos.service';
import { CrearDescuentoDto } from './dto/create-descuento.dto';
import { UpdateDescuentoDto } from './dto/update-descuento.dto';
import { Public } from 'src/auth/public.decorator';
import { ObtenerDescuentosDto } from './dto/obtener-descuentos.dto';

@Controller('descuentos')
export class DescuentosController {
  constructor(private readonly descuentosService: DescuentosService) {}

  @Public()
  @Post('crearDescuento')
  create(@Body() createDescuentoDto: CrearDescuentoDto) {
    return this.descuentosService.create(createDescuentoDto);
  }

  @Public()
  @Post('obtenerDescuentos')
  obtenerDescuentos(@Body() obtenerDescuentosDto: ObtenerDescuentosDto) {
    return this.descuentosService.obtenerDescuentos(obtenerDescuentosDto);
  }

  @Get()
  findAll() {
    return this.descuentosService.findAll();
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
