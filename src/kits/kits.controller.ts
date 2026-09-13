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
import { KitsService } from './kits.service';
import { CrearKitDto } from './dto/crear-kit.dto';
import { ActualizarKitDto } from './dto/ActualizarKitDto';
import { AllowedRoles } from '../auth/roles.decorator';
import { Roles } from '../common/constants';

@Controller('kits')
export class KitsController {
  constructor(private readonly kitsService: KitsService) { }

  @Post('crearKit')
  @AllowedRoles(Roles.ADMIN)
  create(@Body() createKitDto: CrearKitDto) {
    return this.kitsService.create(createKitDto);
  }

  @Get('kits')
  obtenerKits(@Query('sedeId') sedeId: string) {
    if (!sedeId) {
      throw new BadRequestException('El parámetro sedeId es obligatorio');
    }
    return this.kitsService.obtenerKits(+sedeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kitsService.findOne(+id);
  }

  @Patch('/actualizar/:id')
  @AllowedRoles(Roles.ADMIN)
  update(@Param('id') id: string, @Body() updateKitDto: ActualizarKitDto) {
    return this.kitsService.update(+id, updateKitDto);
  }

  @Delete(':id')
  @AllowedRoles(Roles.ADMIN)
  remove(@Param('id') id: string) {
    return this.kitsService.remove(+id);
  }
}
