import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { CajaService } from './caja.service';

import { CrearMovimientoCajaDto } from './dto/crear-movimiento-caja.dto';
import { ActualizarMovimientoCajaDto } from './dto/actualizar-movimiento-caja.dto';
import { Public } from 'src/auth/public.decorator';

@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) { }

  @Post('crearMovimiento')
  registrar(@Body() dto: CrearMovimientoCajaDto) {
    return this.cajaService.registrarMovimiento(dto);
  }

  @Public()
  @Get('movimientosCaja/:sedeId')
  getMovimientos(@Param('sedeId') sedeId: string) {
    return this.cajaService.getMovimientos(Number(sedeId));
  }

  @Public()
  @Patch('actualizar/:id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarMovimientoCajaDto) {
    return this.cajaService.actualizarMovimiento(Number(id), dto);
  }
}
