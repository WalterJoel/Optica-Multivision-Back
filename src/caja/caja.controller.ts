import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CajaService } from './caja.service';
import { CrearCajaDto } from './dto/crear-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CrearMovimientoCajaDto } from './dto/crear-movimiento-caja.dto';
import { Public } from 'src/auth/public.decorator';

@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Post('crearCaja')
  create(@Body() crearCajaDto: CrearCajaDto) {
    return this.cajaService.create(crearCajaDto);
  }

  @Post('cerrarCaja')
  cerrar(@Body() cerrarCajaDto: CerrarCajaDto) {
    return this.cajaService.cerrarCaja(cerrarCajaDto);
  }

  // @Get('cajas')
  // getCajas() {
  //   return this.cajaService.getCajas();
  // }

  @Public()
  @Get('validarCajaAbierta/:sedeId')
  validarCajaAbierta(@Param('sedeId') sedeId: string) {
    return this.cajaService.validarCajaAbierta(Number(sedeId));
  }
  // ┌───────────────────────────────────────────────┐
  // │  ✅  SECCIÓN MOVIMIENTO DE CAJA               │
  // └───────────────────────────────────────────────┘

  @Post('crearMovimiento')
  registrar(@Body() dto: CrearMovimientoCajaDto) {
    return this.cajaService.registrarMovimiento(dto);
  }

  @Get('movimientoCaja/:sedeId')
  getMovimientos(@Param('sedeId') sedeId: string) {
    return this.cajaService.getMovimientos(Number(sedeId));
  }
}
