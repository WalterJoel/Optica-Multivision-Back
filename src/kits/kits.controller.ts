import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { KitsService } from './kits.service';
import { CrearKitDto } from './dto/crear-kit.dto';
import { ActualizarKitDto } from './dto/ActualizarKitDto';
import { Public } from 'src/auth/public.decorator';

@Controller('kits')
export class KitsController {
  constructor(private readonly kitsService: KitsService) {}

  @Post('crearKit')
  create(@Body() createKitDto: CrearKitDto) {
    return this.kitsService.create(createKitDto);
  }

  @Public()
  @Get('kits')
  obtenerKits() {
    return this.kitsService.obtenerKits();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kitsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateKitDto: ActualizarKitDto) {
    return this.kitsService.update(+id, updateKitDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.kitsService.remove(+id);
  }
}
