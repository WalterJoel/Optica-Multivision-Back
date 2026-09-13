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
import { AllowedRoles } from '../auth/roles.decorator';
import { Roles } from '../common/constants';

@Controller('sedes')
export class SedesController {
  constructor(private readonly sedesService: SedesService) {}

  @Post('crearSede')
  @AllowedRoles(Roles.ADMIN)
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
  @AllowedRoles(Roles.ADMIN)
  update(@Param('id') id: string, @Body() updateSedeDto: UpdateSedeDto) {
    return this.sedesService.update(+id, updateSedeDto);
  }
  @Patch(':id/status')
  @AllowedRoles(Roles.ADMIN)
  updateStatus(@Param('id') id: string, @Body() body: { activo: boolean }) {
    return this.sedesService.updateStatus(+id, body.activo);
  }

  @Delete(':id')
  @AllowedRoles(Roles.ADMIN)
  remove(@Param('id') id: string) {
    return this.sedesService.remove(+id);
  }
}
