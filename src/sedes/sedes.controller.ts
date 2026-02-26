import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SedesService } from './sedes.service';
import { CrearSedeDto } from './dto/crear-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';

@Controller('sedes')
export class SedesController {
  constructor(private readonly sedesService: SedesService) {}

  @Post('crearSede')
  create(@Body() crearSedeDto: CrearSedeDto) {
    return this.sedesService.crearSede(crearSedeDto);
  }

  @Get()
  findAll() {
    return this.sedesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sedesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSedeDto: UpdateSedeDto) {
    return this.sedesService.update(+id, updateSedeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sedesService.remove(+id);
  }
}
