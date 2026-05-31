import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CajaService } from './caja.service';

import { CrearMovimientoCajaDto } from './dto/crear-movimiento-caja.dto';

@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) { }

  @Post('crearMovimiento')
  registrar(@Body() dto: CrearMovimientoCajaDto) {
    return this.cajaService.registrarMovimiento(dto);
  }

  @Get('movimientosCaja/:sedeId')
  getMovimientos(@Param('sedeId') sedeId: string) {
    return this.cajaService.getMovimientos(Number(sedeId));
  }
}
