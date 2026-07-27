import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { KardexService } from './kardex.service';
import { QueryKardexDto } from './dto/query-kardex.dto';

@Controller('kardex')
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  @Get('obtenerhistorial')
  async obtenerHistorial(@Query() query: QueryKardexDto) {
    return await this.kardexService.obtenerHistorial(query);
  }
}
