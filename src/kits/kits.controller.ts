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

@Controller('kits')
export class KitsController {
  constructor(private readonly kitsService: KitsService) {}

  @Post()
  create(@Body() createKitDto: CrearKitDto) {
    return this.kitsService.create(createKitDto);
  }

  @Get()
  findAll() {
    return this.kitsService.findAll();
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
