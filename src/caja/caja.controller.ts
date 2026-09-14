import { Controller, Post, Body, Get, Param, Patch, Query } from '@nestjs/common';
import { CajaService } from './caja.service';

import { CrearMovimientoCajaDto } from './dto/crear-movimiento-caja.dto';
import { ActualizarMovimientoCajaDto } from './dto/actualizar-movimiento-caja.dto';
import { BuscarMovimientosDto } from './dto/buscar-movimientos.dto';
import { AllowedRoles } from '../auth/roles.decorator';
import { Roles } from '../common/constants';

@Controller('caja')

export class CajaController {
  constructor(private readonly cajaService: CajaService) { }

  @Post('crearMovimiento')
  @AllowedRoles(Roles.ADMIN, Roles.VENDEDOR)
  registrar(@Body() dto: CrearMovimientoCajaDto) {
    return this.cajaService.registrarMovimiento(dto);
  }

  @Get('buscarMovimientosPorRango')
  buscarMovimientos(@Query() query: BuscarMovimientosDto) {
    const { sedeId, fechaInicio, fechaFin } = query;
    return this.cajaService.buscarMovimientosPorRango(sedeId, fechaInicio, fechaFin);
  }

  @Get('movimientosCaja/:sedeId')
  getMovimientos(@Param('sedeId') sedeId: string) {
    return this.cajaService.getMovimientos(Number(sedeId));
  }

  @Patch('actualizar/:id')
  @AllowedRoles(Roles.ADMIN)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarMovimientoCajaDto) {
    return this.cajaService.actualizarMovimiento(Number(id), dto);
  }
}
