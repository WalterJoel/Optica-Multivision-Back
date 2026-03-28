import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { Public } from '../auth/public.decorator';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}
  // ┌───────────────────────────────────────────────┐
  // │  📦 SECCIÓN: VENTAS                          │
  // └───────────────────────────────────────────────┘

  @Post('crearVenta')
  create(@Body() createVentaDto: CrearVentaDto) {
    return this.ventasService.crearVenta(createVentaDto);
  }

  @Public()
  @Get('ventas')
  obtenerVentas() {
    return this.ventasService.obtenerVentas();
  }
  // ┌───────────────────────────────────────────────┐
  // │  📦 SECCIÓN: SEGUIMIENTO DE PEDIDOS          │
  // └───────────────────────────────────────────────┘

  @Get('obtenerSeguimientosCreados')
  obtenerCreados() {
    return this.ventasService.obtenerSeguimientosCreados();
  }
}
